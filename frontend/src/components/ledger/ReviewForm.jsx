import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ShoppingBag, TrendingDown, Loader2, Edit3 } from 'lucide-react';

const EMPTY_ITEM = { name: '', quantity: '1', unitPrice: '', totalPrice: '' };
const EMPTY_EXPENSE = { description: '', category: 'raw_material', amount: '' };

export default function ReviewForm({ initialItems, initialExpenses, reviewSource, processing, onSave, onDiscard, error, reviewMode }) {
  const [manualItems, setManualItems] = useState([{ ...EMPTY_ITEM }]);
  const [manualExpenses, setManualExpenses] = useState([{ ...EMPTY_EXPENSE }]);

  useEffect(() => {
    setManualItems(initialItems?.length > 0 ? initialItems : [{ ...EMPTY_ITEM }]);
    setManualExpenses(initialExpenses?.length > 0 ? initialExpenses : [{ ...EMPTY_EXPENSE }]);
  }, [initialItems, initialExpenses]);

  const updateItem = (index, field, value) => {
    setManualItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : updated[index].quantity) || 0;
        const price = Number(field === 'unitPrice' ? value : updated[index].unitPrice) || 0;
        updated[index].totalPrice = String(qty * price);
      }
      return updated;
    });
  };

  const addItem = () => setManualItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => {
    if (manualItems.length <= 1) return;
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExpense = (index, field, value) => {
    setManualExpenses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addExpense = () => setManualExpenses((prev) => [...prev, { ...EMPTY_EXPENSE }]);
  const removeExpense = (index) => {
    if (manualExpenses.length <= 1) return;
    setManualExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const manualTotalSales = manualItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const manualTotalExpenses = manualExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
  const manualProfit = manualTotalSales - manualTotalExpenses;

  const handleManualSubmit = () => {
    const validItems = manualItems.filter((it) => it.name.trim() && Number(it.totalPrice) > 0);
    const validExpenses = manualExpenses.filter((ex) => (ex.description?.trim() || ex.category) && Number(ex.amount) > 0);
    onSave({ items: validItems, expenses: validExpenses });
  };

  return (
    <div className="animate-[fadeIn_0.4s_ease]">
      {reviewMode && reviewSource && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 'var(--radius-3xl)',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
            background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
          }}>
            <Edit3 size={20} style={{ color: 'var(--text-accent)' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Review AI Extracted Data
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {reviewSource === 'speech' ? '⚡ From Live Speech' : reviewSource === 'audio' ? '🎵 From Audio Upload' : '🤖 From Assistant Chat'}
              {' — '}Edit any values below, then confirm to save
            </div>
          </div>
        </div>
      )}

      {/* Items Section */}
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)', padding: '24px', marginBottom: '16px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden',
          width: '100%',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gradient-primary)', borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} style={{ color: 'var(--primary-500)' }} /> Items Sold
          </h3>
          <button onClick={addItem} className="transition-all duration-200 cursor-pointer border-0 hover:scale-105" style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--primary-500)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
          {['Item Name', 'Qty', 'Unit Price (₹)', 'Total (₹)', ''].map(h => (
            <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>

        {/* Item rows */}
        {manualItems.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
            <input
              type="text" placeholder="e.g. Samosa" value={item.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%' }}
            />
            <input
              type="number" placeholder="1" value={item.quantity} min="1"
              onChange={e => updateItem(i, 'quantity', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%' }}
            />
            <input
              type="number" placeholder="₹10" value={item.unitPrice} min="0"
              onChange={e => updateItem(i, 'unitPrice', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%' }}
            />
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-500)', textAlign: 'center' }}>
              ₹{Number(item.totalPrice) || 0}
            </div>
            <button onClick={() => removeItem(i)} disabled={manualItems.length <= 1} className="cursor-pointer border-0 transition-all duration-200 disabled:opacity-20" style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-lg)', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-400)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Expenses Section */}
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)', padding: '24px', marginBottom: '16px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden',
          width: '100%',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #ef4444, #f97316)', borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={18} style={{ color: 'var(--danger-400)' }} /> Expenses (Raw Materials, etc.)
          </h3>
          <button onClick={addExpense} className="transition-all duration-200 cursor-pointer border-0 hover:scale-105" style={{ background: 'rgba(239,68,68,0.06)', color: 'var(--danger-400)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Expense
          </button>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 40px', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
          {['Description', 'Category', 'Amount (₹)', ''].map(h => (
            <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>

        {/* Expense rows */}
        {manualExpenses.map((exp, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 40px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
            <input
              type="text" placeholder="e.g. Oil, Flour" value={exp.description}
              onChange={e => updateExpense(i, 'description', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%' }}
            />
            <select
              value={exp.category}
              onChange={e => updateExpense(i, 'category', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%' }}
            >
              <option value="raw_material">Raw Material</option>
              <option value="transport">Transport</option>
              <option value="rent">Rent</option>
              <option value="labor">Labor</option>
              <option value="utilities">Utilities</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number" placeholder="₹200" value={exp.amount} min="0"
              onChange={e => updateExpense(i, 'amount', e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%' }}
            />
            <button onClick={() => removeExpense(i)} disabled={manualExpenses.length <= 1} className="cursor-pointer border-0 transition-all duration-200 disabled:opacity-20" style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-lg)', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-400)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Totals Summary */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-3xl)', padding: '20px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center',
        marginBottom: '16px', boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)',
        width: '100%',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Sales</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-500)' }}>₹{manualTotalSales.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Expenses</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger-400)' }}>₹{manualTotalExpenses.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Net Profit</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: manualProfit >= 0 ? 'var(--primary-500)' : 'var(--danger-400)' }}>
            {manualProfit >= 0 ? '+' : ''}₹{manualProfit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <button
          onClick={handleManualSubmit}
          disabled={processing}
          className="transition-all duration-200 cursor-pointer border-0 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{
            flex: 1, background: 'var(--gradient-primary)', color: 'white',
            padding: '14px 24px', borderRadius: 'var(--radius-lg)',
            fontSize: '0.92rem', fontWeight: 700, fontFamily: 'var(--font-body)',
            boxShadow: '0 6px 20px -4px rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {processing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {processing ? 'Saving...' : reviewMode ? 'Confirm & Save ✓' : 'Save to Ledger'}
        </button>
        <button
          onClick={onDiscard}
          className="transition-all duration-200 cursor-pointer"
          style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            color: 'var(--danger-400)', padding: '14px 20px', borderRadius: 'var(--radius-lg)',
            fontSize: '0.88rem', fontWeight: 600,
          }}
        >
          {reviewMode ? 'Cancel' : 'Clear All'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: '12px', color: 'var(--danger-400)', fontSize: '0.85rem', textAlign: 'center' }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
