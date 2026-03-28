"""
VoiceTrace ML Service — FastAPI Demand Forecasting Microservice

Exposes a /predict endpoint that accepts raw ledger entries
and returns per-item demand forecasts using Facebook Prophet.

Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

from forecaster import forecast_demand

# Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VoiceTrace ML Service",
    description="AI-powered demand forecasting for street vendors",
    version="1.0.0",
)

# CORS — allow Node backend to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---

class ItemEntry(BaseModel):
    name: str
    quantity: float = 0
    unitPrice: float = 0
    totalPrice: float = 0

class ExpenseEntry(BaseModel):
    category: str = "other"
    amount: float = 0
    description: str = ""

class MissedProfit(BaseModel):
    item: str
    estimatedLoss: float = 0

class LedgerEntry(BaseModel):
    date: str
    items: List[ItemEntry] = []
    expenses: List[ExpenseEntry] = []
    missedProfits: List[MissedProfit] = []
    totalRevenue: float = 0
    totalExpenses: float = 0
    netProfit: float = 0

class ForecastRequest(BaseModel):
    entries: List[LedgerEntry]
    forecastDays: int = 7
    vendorName: Optional[str] = None
    businessCategory: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# --- Endpoints ---

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "voicetrace-ml",
        "version": "1.0.0",
    }


@app.post("/predict")
def predict_demand(request: ForecastRequest):
    """
    Predict demand for each item based on historical ledger entries.

    Accepts the vendor's raw ledger data and returns per-item forecasts
    with exact predicted quantities and confidence intervals.
    """
    try:
        if not request.entries:
            raise HTTPException(status_code=400, detail="No entries provided")

        # Convert Pydantic models to dicts for the forecaster
        entries_dicts = []
        for entry in request.entries:
            entries_dicts.append({
                'date': entry.date,
                'items': [item.model_dump() for item in entry.items],
                'expenses': [exp.model_dump() for exp in entry.expenses],
                'missedProfits': [mp.model_dump() for mp in entry.missedProfits],
                'totalRevenue': entry.totalRevenue,
                'totalExpenses': entry.totalExpenses,
                'netProfit': entry.netProfit,
            })

        logger.info(
            f"[Forecast] Processing {len(entries_dicts)} entries for "
            f"{request.vendorName or 'unknown'} ({request.businessCategory or 'general'})"
        )

        result = forecast_demand(entries_dicts, forecast_days=request.forecastDays)

        return {
            "success": True,
            "data": result,
            "meta": {
                "entriesProcessed": len(entries_dicts),
                "forecastDays": request.forecastDays,
                "itemsForecasted": len(result.get('topPredictions', [])),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Forecast] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecasting failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
