"""
VoiceTrace — Demand Forecaster using Facebook Prophet
Trains lightweight per-item time-series models on the fly.
"""

import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta
import logging
import warnings

# Suppress noisy Prophet/cmdstanpy logs
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)
logging.getLogger('prophet').setLevel(logging.WARNING)
warnings.filterwarnings('ignore', category=FutureWarning)


def forecast_demand(entries: list, forecast_days: int = 7) -> dict:
    """
    Given raw ledger entries, forecast demand for each item.

    Args:
        entries: list of dicts with keys: date, items[{name, quantity, totalPrice}],
                 totalRevenue, totalExpenses, netProfit
        forecast_days: how many days to predict into the future

    Returns:
        {
            "totalRevenueForecast": [...],
            "itemForecasts": {
                "samosa": { "history": [...], "forecast": [...], "avgDaily": N, "trend": "up/down/stable" },
                ...
            },
            "topPredictions": [
                { "item": "samosa", "predictedQty": 55, "confidence": [45, 65], "trend": "up" },
                ...
            ]
        }
    """
    if not entries or len(entries) < 2:
        return {"error": "Need at least 2 days of data for forecasting", "itemForecasts": {}, "topPredictions": []}

    # --- 1. Build per-item daily dataframes ---
    item_daily = {}  # { item_name: { date_str: { qty, revenue } } }
    revenue_daily = {}  # { date_str: revenue }

    for entry in entries:
        date_str = entry.get('date', '')[:10]  # YYYY-MM-DD
        if not date_str:
            continue

        rev = entry.get('totalRevenue', 0)
        revenue_daily[date_str] = revenue_daily.get(date_str, 0) + rev

        for item in entry.get('items', []):
            name = (item.get('name', '') or 'unknown').lower().strip()
            if name == 'unknown':
                continue
            if name not in item_daily:
                item_daily[name] = {}
            if date_str not in item_daily[name]:
                item_daily[name][date_str] = {'qty': 0, 'revenue': 0}
            item_daily[name][date_str]['qty'] += item.get('quantity', 0)
            item_daily[name][date_str]['revenue'] += item.get('totalPrice', 0)

    # --- 2. Forecast total revenue ---
    total_revenue_forecast = _forecast_series(
        revenue_daily, value_key=None, forecast_days=forecast_days
    )

    # --- 3. Forecast per item ---
    item_forecasts = {}
    top_predictions = []

    for item_name, daily_data in item_daily.items():
        if len(daily_data) < 2:
            # Not enough data for this item
            avg_qty = sum(d['qty'] for d in daily_data.values()) / max(len(daily_data), 1)
            top_predictions.append({
                'item': item_name,
                'predictedQty': round(avg_qty),
                'confidence': [round(avg_qty * 0.7), round(avg_qty * 1.3)],
                'trend': 'stable',
                'method': 'average'
            })
            continue

        # Build qty series
        qty_series = {d: v['qty'] for d, v in daily_data.items()}
        forecast_result = _forecast_series(qty_series, forecast_days=forecast_days)

        if forecast_result:
            history = [{'date': d, 'qty': v} for d, v in sorted(qty_series.items())]
            avg_daily = sum(qty_series.values()) / len(qty_series)

            # Determine trend from forecast
            if len(forecast_result) >= 2:
                first_pred = forecast_result[0]['predicted']
                last_pred = forecast_result[-1]['predicted']
                if last_pred > first_pred * 1.1:
                    trend = 'up'
                elif last_pred < first_pred * 0.9:
                    trend = 'down'
                else:
                    trend = 'stable'
            else:
                trend = 'stable'

            item_forecasts[item_name] = {
                'history': history,
                'forecast': forecast_result,
                'avgDaily': round(avg_daily, 1),
                'trend': trend,
            }

            # Tomorrow's prediction (first forecast point)
            tomorrow = forecast_result[0]
            top_predictions.append({
                'item': item_name,
                'predictedQty': max(0, round(tomorrow['predicted'])),
                'confidence': [
                    max(0, round(tomorrow['lower'])),
                    max(0, round(tomorrow['upper']))
                ],
                'trend': trend,
                'method': 'prophet'
            })

    # Sort predictions by predicted qty (most demanded first)
    top_predictions.sort(key=lambda x: x['predictedQty'], reverse=True)

    return {
        'totalRevenueForecast': total_revenue_forecast,
        'itemForecasts': item_forecasts,
        'topPredictions': top_predictions[:10],  # Top 10 items
    }


def _forecast_series(daily_dict: dict, value_key: str = None, forecast_days: int = 7) -> list:
    """
    Use Prophet to forecast a simple {date: value} time series.

    Args:
        daily_dict: { 'YYYY-MM-DD': value } or { 'YYYY-MM-DD': { key: value } }
        value_key: if dict values are dicts, extract this key. None if values are scalars.
        forecast_days: days to predict ahead

    Returns: list of { date, predicted, lower, upper }
    """
    try:
        rows = []
        for date_str, val in sorted(daily_dict.items()):
            try:
                ds = pd.Timestamp(date_str)
                y = val if value_key is None else val.get(value_key, 0)
                if y is not None and y >= 0:
                    rows.append({'ds': ds, 'y': float(y)})
            except (ValueError, TypeError):
                continue

        if len(rows) < 2:
            return []

        df = pd.DataFrame(rows)

        # Configure Prophet — lightweight and fast
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True if len(rows) >= 7 else False,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05,  # Less sensitive to noise
            seasonality_mode='multiplicative',
        )

        # Suppress stdout from Prophet
        model.fit(df)

        # Create future dataframe
        future = model.make_future_dataframe(periods=forecast_days, freq='D')
        prediction = model.predict(future)

        # Extract only the forecast period (not historical)
        forecast_rows = prediction.tail(forecast_days)
        result = []
        for _, row in forecast_rows.iterrows():
            result.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted': round(max(0, row['yhat']), 1),
                'lower': round(max(0, row['yhat_lower']), 1),
                'upper': round(max(0, row['yhat_upper']), 1),
            })

        return result

    except Exception as e:
        logging.error(f"Prophet forecasting error: {e}")
        return []
