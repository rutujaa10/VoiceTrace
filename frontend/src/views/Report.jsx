/**
 * Report — Date-wise Business Reports with PDF Export
 *
 * Features:
 *  - Custom date range picker (From → To)
 *  - Quick presets: This Week, This Month, Last Month, This Year
 *  - Summary cards: Total Sales, Expenses, Profit, Entries
 *  - Daily breakdown table
 *  - Export to structured PDF via jspdf + autotable
 */

import { useState, useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { ledgerAPI } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calendar, Download, FileText, TrendingUp, TrendingDown,
  IndianRupee, BarChart3, Filter, Loader2, ChevronDown
} from 'lucide-react';

// ── Date helpers ──
function fmt(d) { return d.toISOString().slice(0, 10); }
function fmtDisplay(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function startOfWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; }
function startOfLastMonth() { const d = new Date(); d.setMonth(d.getMonth()-1, 1); d.setHours(0,0,0,0); return d; }
function endOfLastMonth() { const d = new Date(); d.setDate(0); d.setHours(23,59,59,999); return d; }
function startOfYear() { return new Date(new Date().getFullYear(), 0, 1); }

export default function Report() {
  const { state } = useApp();

  // Date range
  const [fromDate, setFromDate] = useState(fmt(startOfMonth()));
  const [toDate, setToDate] = useState(fmt(new Date()));
  const [activePreset, setActivePreset] = useState('month');

  // Data
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Presets
  const presets = [
    { key: 'week', label: 'This Week', from: () => startOfWeek(), to: () => new Date() },
    { key: 'month', label: 'This Month', from: () => startOfMonth(), to: () => new Date() },
    { key: 'lastMonth', label: 'Last Month', from: () => startOfLastMonth(), to: () => endOfLastMonth() },
    { key: 'year', label: 'This Year', from: () => startOfYear(), to: () => new Date() },
  ];

  const applyPreset = (p) => {
    setActivePreset(p.key);
    setFromDate(fmt(p.from()));
    setToDate(fmt(p.to()));
  };

  // Fetch
  const fetchReport = async () => {
    if (!state.vendorId) return;
    setLoading(true);
    try {
      // Fetch all entries in date range (large limit to get everything)
      const res = await ledgerAPI.getEntries(state.vendorId, {
        page: 1,
        limit: 500,
        startDate: fromDate,
        endDate: toDate,
      });
      setEntries(res.data.data || []);
      setFetched(true);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Summary calculations
  const summary = useMemo(() => {
    let totalSales = 0, totalExpenses = 0, totalItems = 0;
    const dailyMap = {};

    entries.forEach(entry => {
      const day = new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (!dailyMap[day]) dailyMap[day] = { date: day, rawDate: entry.date, sales: 0, expenses: 0, profit: 0, items: 0, itemNames: [] };
      const rev = entry.totalRevenue || 0;
      const exp = entry.totalExpenses || 0;
      dailyMap[day].sales += rev;
      dailyMap[day].expenses += exp;
      dailyMap[day].profit += (rev - exp);
      dailyMap[day].items += (entry.items?.length || 0);
      totalSales += rev;
      totalExpenses += exp;
      totalItems += (entry.items?.length || 0);
      (entry.items || []).forEach(it => {
        if (!dailyMap[day].itemNames.includes(it.name)) dailyMap[day].itemNames.push(it.name);
      });
    });

    const daily = Object.values(dailyMap).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    return { totalSales, totalExpenses, totalProfit: totalSales - totalExpenses, totalEntries: entries.length, totalItems, daily };
  }, [entries]);

  // ── PDF Export ──
  const exportPDF = () => {
    const doc = new jsPDF();
    const vendorName = state.vendor?.name || state.dashboard?.vendor?.name || 'Vendor';
    const now = new Date().toLocaleString('en-IN');

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VoiceTrace — Business Report', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Vendor: ${vendorName}`, 14, 28);
    doc.text(`Period: ${fmtDisplay(fromDate)} to ${fmtDisplay(toDate)}`, 14, 34);
    doc.text(`Generated: ${now}`, 14, 40);

    // Divider
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.line(14, 44, 196, 44);

    // Summary Box
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Summary', 14, 52);

    const summaryData = [
      ['Total Sales', `Rs. ${summary.totalSales.toLocaleString('en-IN')}`],
      ['Total Expenses', `Rs. ${summary.totalExpenses.toLocaleString('en-IN')}`],
      ['Net Profit', `Rs. ${summary.totalProfit.toLocaleString('en-IN')}`],
      ['Total Entries', `${summary.totalEntries}`],
      ['Total Items Sold', `${summary.totalItems}`],
    ];

    autoTable(doc, {
      startY: 56,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    });

    // Daily Breakdown
    const breakdownY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Breakdown', 14, breakdownY);

    const dailyRows = summary.daily.map(d => [
      d.date,
      `Rs. ${d.sales.toLocaleString('en-IN')}`,
      `Rs. ${d.expenses.toLocaleString('en-IN')}`,
      `Rs. ${d.profit.toLocaleString('en-IN')}`,
      `${d.items}`,
      d.itemNames.slice(0, 4).join(', ') + (d.itemNames.length > 4 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: breakdownY + 4,
      head: [['Date', 'Sales', 'Expenses', 'Profit', 'Items', 'Top Products']],
      body: dailyRows,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center', cellWidth: 16 },
        5: { cellWidth: 50 },
      },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`VoiceTrace Report | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`VoiceTrace_Report_${fromDate}_to_${toDate}.pdf`);
  };

  // ── Render ──
  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          <BarChart3 size={32} style={{ display: 'inline', color: 'var(--primary-500)', verticalAlign: 'text-bottom', marginRight: '8px' }} /> <span className="gradient-text">Reports</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
          Generate date-wise business reports and export to PDF
        </p>
      </div>

      {/* ── Filter Card ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-3xl)', padding: '24px', marginBottom: '24px',
        boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gradient-primary)', borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0' }} />

        {/* Preset Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className="transition-all duration-200 cursor-pointer border-0"
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                background: activePreset === p.key ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                color: activePreset === p.key ? 'white' : 'var(--text-secondary)',
                border: activePreset === p.key ? 'none' : '1px solid var(--border-subtle)',
                boxShadow: activePreset === p.key ? '0 4px 12px -2px rgba(34,197,94,0.3)' : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setActivePreset(''); }}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setActivePreset(''); }}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
              }}
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="transition-all duration-200 cursor-pointer border-0 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
            style={{
              background: 'var(--gradient-primary)', color: 'white',
              padding: '10px 24px', borderRadius: 'var(--radius-lg)',
              fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 16px -3px rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', gap: '6px', minHeight: '42px',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
            {loading ? 'Loading...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {fetched && !loading && (
        <div className="animate-[fadeIn_0.4s_ease]">

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Sales', value: `₹${summary.totalSales.toLocaleString('en-IN')}`, icon: <TrendingUp size={18} />, color: 'var(--primary-500)', bg: 'rgba(34,197,94,0.06)' },
              { label: 'Total Expenses', value: `₹${summary.totalExpenses.toLocaleString('en-IN')}`, icon: <TrendingDown size={18} />, color: 'var(--danger-400)', bg: 'rgba(239,68,68,0.06)' },
              { label: 'Net Profit', value: `₹${summary.totalProfit.toLocaleString('en-IN')}`, icon: <IndianRupee size={18} />, color: '#6366f1', bg: 'rgba(99,102,241,0.06)' },
              { label: 'Entries', value: summary.totalEntries, icon: <BarChart3 size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-3xl)', padding: '20px',
                boxShadow: '0 2px 10px -2px rgba(0,0,0,0.04)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: card.color }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                    {card.icon}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{card.label}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Export Button */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                onClick={exportPDF}
                className="transition-all duration-200 cursor-pointer border-0 hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                  color: '#ef4444', padding: '10px 20px', borderRadius: 'var(--radius-lg)',
                  fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <Download size={16} />
                Export PDF
              </button>
            </div>
          )}

          {/* Daily Breakdown Table */}
          {summary.daily.length > 0 ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-3xl)', overflow: 'hidden',
              boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)',
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.6fr',
                padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(34,197,94,0.04)',
              }}>
                {['Date', 'Sales', 'Expenses', 'Profit', 'Items'].map(h => (
                  <div key={h} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Table Rows */}
              {summary.daily.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.6fr',
                    padding: '14px 20px',
                    borderBottom: i < summary.daily.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.date}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-500)' }}>₹{row.sales.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--danger-400)' }}>₹{row.expenses.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: row.profit >= 0 ? 'var(--primary-500)' : 'var(--danger-400)' }}>
                    {row.profit >= 0 ? '+' : ''}₹{row.profit.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{row.items}</div>
                </div>
              ))}

              {/* Total Row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.6fr',
                padding: '14px 20px', borderTop: '2px solid var(--border-subtle)',
                background: 'rgba(34,197,94,0.04)',
              }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>Total</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-500)' }}>₹{summary.totalSales.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--danger-400)' }}>₹{summary.totalExpenses.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: summary.totalProfit >= 0 ? 'var(--primary-500)' : 'var(--danger-400)' }}>
                  {summary.totalProfit >= 0 ? '+' : ''}₹{summary.totalProfit.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>{summary.totalItems}</div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-3xl)', padding: '48px 24px', textAlign: 'center',
            }}>
              <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>No data found</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Try selecting a different date range</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!fetched && !loading && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)', padding: '60px 24px', textAlign: 'center',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)',
        }}>
          <BarChart3 size={48} style={{ color: 'var(--primary-500)', marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Select a date range & generate</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Choose a preset or custom dates above, then click <strong>Generate</strong> to view your report.
          </p>
        </div>
      )}
    </div>
  );
}
