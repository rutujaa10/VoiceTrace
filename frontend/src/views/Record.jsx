/**
 * Record View — Voice-to-Ledger with triple mode (Enhanced)
 *
 * Mode 1 (default): Web Speech API — free, real-time browser transcription
 * Mode 2 (fallback): Audio Recording → Whisper — better accuracy, word timestamps
 * Mode 3 (new):      Manual Entry — typed form for items & expenses
 *
 * Enhanced features:
 * - Phase 4 Feature 6: Shows isApproximate / needsConfirmation flags on extracted items
 * - Phase 4 Feature 7: Shows anomaly alerts after processing
 * - Phase 4 Feature 8: Audio playback button per extracted item (Whisper mode)
 */

import { useState, useCallback } from 'react';
import { useApp, actionTypes } from '../state/AppContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { ledgerAPI } from '../api';
import AnomalyAlert from '../components/common/AnomalyAlert';
import {
  Plus, Trash2, Save, ShoppingBag, TrendingDown,
  Loader2, CheckCircle, RotateCcw, Edit3, ArrowRight
} from 'lucide-react';

const LANGUAGES = [
  { code: 'hi-IN', label: '🇮🇳 Hindi', short: 'hi' },
  { code: 'en-IN', label: '🇬🇧 English', short: 'en' },
];

const EMPTY_ITEM = { name: '', quantity: '1', unitPrice: '', totalPrice: '' };
const EMPTY_EXPENSE = { description: '', category: 'raw_material', amount: '' };

export default function Record() {
  const { state, dispatch } = useApp();

  // Mode toggle
  const [mode, setMode] = useState('speech'); // 'speech' | 'audio' | 'manual'
  const [lang, setLang] = useState(LANGUAGES[0]);

  // Web Speech API hook
  const speech = useVoiceRecorder({ lang: lang.code, maxDurationSeconds: 180 });

  // Audio recording fallback hook
  const recorder = useAudioRecorder(180);

  // Shared UI state
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Review mode — shows editable form after AI extraction
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewSource, setReviewSource] = useState(null); // 'speech' | 'audio'

  // Manual entry state (also used for review mode editing)
  const [manualItems, setManualItems] = useState([{ ...EMPTY_ITEM }]);
  const [manualExpenses, setManualExpenses] = useState([{ ...EMPTY_EXPENSE }]);
  const [manualSaved, setManualSaved] = useState(false);

  // Phase 4 Feature 8: Audio playback for items
  const audioPlayback = useAudioPlayback(result?.entry?.audioUrl);

  const isActive = mode === 'speech' ? speech.isListening : mode === 'audio' ? recorder.isRecording : false;

  // ---- Handle mic button ----
  const handleToggle = useCallback(() => {
    setError('');

    if (mode === 'speech') {
      if (speech.isListening) {
        speech.stopListening();
      } else {
        setResult(null);
        speech.startListening();
      }
    } else if (mode === 'audio') {
      if (recorder.isRecording) {
        recorder.stopRecording();
      } else {
        setResult(null);
        recorder.startRecording();
      }
    }
  }, [mode, speech, recorder]);

  // ---- Helper: populate review form from AI extraction ----
  const populateReviewForm = (extraction) => {
    const items = (extraction.items || []).map(item => ({
      name: item.name || '',
      quantity: String(item.quantity || 1),
      unitPrice: String(item.unitPrice || ''),
      totalPrice: String(item.totalPrice || 0),
    }));
    const expenses = (extraction.expenses || []).map(exp => ({
      description: exp.description || exp.category || '',
      category: exp.category || 'raw_material',
      amount: String(exp.amount || 0),
    }));

    setManualItems(items.length > 0 ? items : [{ ...EMPTY_ITEM }]);
    setManualExpenses(expenses.length > 0 ? expenses : [{ ...EMPTY_EXPENSE }]);
    setReviewMode(true);
  };

  // ---- Submit transcript (Web Speech mode) — extract only, show for review ----
  const handleSubmitText = async () => {
    if (!speech.hasTranscript) return;

    setProcessing(true);
    setError('');
    try {
      const res = await ledgerAPI.extractOnly(
        state.vendorId,
        speech.transcript,
        lang.short
      );
      const extraction = res.data.data.extraction;
      populateReviewForm(extraction);
      setReviewSource('speech');
      speech.resetTranscript();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ---- Upload audio blob (Whisper mode) — extract, show for review ----
  const handleUploadAudio = async () => {
    if (!recorder.audioBlob) return;

    setProcessing(true);
    setError('');
    try {
      const res = await ledgerAPI.uploadAudio(state.vendorId, recorder.audioBlob);
      const data = res.data.data;
      // Audio upload returns extraction + saved entry. We'll populate review form
      // and save via manual entry (the already-saved entry will be overwritten)
      if (data.extraction) {
        populateReviewForm(data.extraction);
        setReviewSource('audio');
      } else {
        setResult(data);
      }
      recorder.resetRecording();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ---- Manual entry helpers ----
  const updateItem = (index, field, value) => {
    setManualItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-calculate totalPrice
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : updated[index].quantity) || 0;
        const price = Number(field === 'unitPrice' ? value : updated[index].unitPrice) || 0;
        updated[index].totalPrice = String(qty * price);
      }
      return updated;
    });
  };

  const addItem = () => setManualItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => {
    if (manualItems.length <= 1) return;
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateExpense = (index, field, value) => {
    setManualExpenses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addExpense = () => setManualExpenses(prev => [...prev, { ...EMPTY_EXPENSE }]);
  const removeExpense = (index) => {
    if (manualExpenses.length <= 1) return;
    setManualExpenses(prev => prev.filter((_, i) => i !== index));
  };

  // Manual totals
  const manualTotalSales = manualItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const manualTotalExpenses = manualExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
  const manualProfit = manualTotalSales - manualTotalExpenses;

  // ---- Submit manual entry ----
  const handleManualSubmit = async () => {
    const validItems = manualItems.filter(it => it.name.trim() && Number(it.totalPrice) > 0);
    const validExpenses = manualExpenses.filter(ex => ex.description.trim() && Number(ex.amount) > 0);

    if (validItems.length === 0 && validExpenses.length === 0) {
      setError('Add at least one item or expense');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const res = await ledgerAPI.manualEntry(state.vendorId, {
        items: validItems,
        expenses: validExpenses,
      });
      setResult(res.data.data);
      setManualSaved(true);
      setReviewMode(false);

      if (res.data.data.loanReadiness) {
        dispatch({
          type: actionTypes.SET_LOAN_SCORE,
          payload: res.data.data.loanReadiness,
        });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ---- Reset everything ----
  const handleDiscard = () => {
    if (mode === 'speech') {
      speech.resetTranscript();
    } else if (mode === 'audio') {
      recorder.resetRecording();
    }
    setResult(null);
    setError('');
    setManualSaved(false);
    setReviewMode(false);
    setReviewSource(null);
    setManualItems([{ ...EMPTY_ITEM }]);
    setManualExpenses([{ ...EMPTY_EXPENSE }]);
  };

  const hasData = mode === 'speech' ? speech.hasTranscript : mode === 'audio' ? !!recorder.audioBlob : false;
  const formattedTime = mode === 'speech' ? speech.formattedTime : mode === 'audio' ? recorder.formattedTime : '0:00';
  const hookError = mode === 'speech' ? speech.error : mode === 'audio' ? recorder.error : '';

  return (
    <div className="stagger-children">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
          }}
        >
          🎙️ <span className="gradient-text">Record Sales</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Speak naturally or type your sales manually
        </p>
      </div>

      {/* Mode + Language Toggles */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          flexWrap: 'wrap',
        }}
      >
        {/* Mode toggle */}
        <div
          className="glass-card"
          style={{
            display: 'inline-flex',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            gap: '2px',
          }}
        >
          <button
            className={`btn btn-sm ${mode === 'speech' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('speech'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            ⚡ Live Speech
          </button>
          <button
            className={`btn btn-sm ${mode === 'audio' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('audio'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            🎵 Audio Upload
          </button>
          <button
            className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('manual'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            ✏️ Manual Entry
          </button>
        </div>

        {/* Language toggle (Speech mode only) */}
        {mode === 'speech' && (
          <div
            className="glass-card"
            style={{
              display: 'inline-flex',
              padding: '4px',
              borderRadius: 'var(--radius-lg)',
              gap: '2px',
            }}
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`btn btn-sm ${lang.code === l.code ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setLang(l)}
                disabled={speech.isListening}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        {/* Mode info badge */}
        <span
          className={`badge ${mode === 'speech' ? 'badge-success' : mode === 'audio' ? 'badge-warning' : 'badge-info'}`}
          style={{ alignSelf: 'center', fontSize: '0.7rem' }}
        >
          {mode === 'speech' ? '💸 Free — Browser STT' : mode === 'audio' ? '🤖 Whisper API' : '📝 Type items & expenses'}
        </span>
      </div>

      {/* ═══════════ EDITABLE FORM (Manual Entry OR AI Review) ═══════════ */}
      {((mode === 'manual' && !manualSaved) || reviewMode) && (
        <div className="animate-[fadeIn_0.4s_ease]">

          {/* Review Mode Banner */}
          {reviewMode && (
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
                  {reviewSource === 'speech' ? '⚡ From Live Speech' : '🎵 From Audio Upload'}
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
          <div style={{ display: 'flex', gap: '12px' }}>
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
              onClick={handleDiscard}
              className="transition-all duration-200 cursor-pointer"
              style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                color: 'var(--danger-400)', padding: '14px 20px', borderRadius: 'var(--radius-lg)',
                fontSize: '0.88rem', fontWeight: 600,
              }}
            >
              Clear All
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: '12px', color: 'var(--danger-400)', fontSize: '0.85rem', textAlign: 'center' }}>
              ❌ {error}
            </div>
          )}
        </div>
      )}

      {/* Saved State — shows after any mode saves */}
      {manualSaved && result && (
        <div className="animate-[fadeIn_0.4s_ease]" style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={40} style={{ color: 'var(--primary-500)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: '6px' }}>Saved Successfully! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Your sales entry has been added to the ledger.</p>

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-3xl)', padding: '20px', maxWidth: '380px', margin: '0 auto 24px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sales</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-500)' }}>₹{result.entry?.totalRevenue || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expenses</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger-400)' }}>₹{result.entry?.totalExpenses || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Profit</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{result.entry?.netProfit || 0}</div>
            </div>
          </div>

          <button onClick={handleDiscard} className="transition-all duration-200 cursor-pointer" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '12px 24px', borderRadius: 'var(--radius-lg)', fontSize: '0.88rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={14} /> Add Another Entry
          </button>
        </div>
      )}


      {/* ═══════════ VOICE MODES (speech / audio) — MIC AREA ═══════════ */}
      {(mode === 'speech' || mode === 'audio') && !reviewMode && (
        <>
          {/* Mic Button Area */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 'var(--space-2xl)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {/* Big Mic Button */}
            <button
              id="mic-record-btn"
              className={`mic-btn ${isActive ? 'recording' : ''}`}
              onClick={handleToggle}
              disabled={processing}
              aria-label={isActive ? 'Stop recording' : 'Start recording'}
            >
              {isActive ? '⏹️' : '🎙️'}
            </button>

            {/* Timer */}
            <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
              {isActive ? (
                <>
                  <div className="mic-timer">{formattedTime}</div>
                  <div className="mic-status" style={{ color: 'var(--danger-400)' }}>
                    🔴 {mode === 'speech' ? 'Listening...' : 'Recording...'} Tap to stop
                  </div>
                </>
              ) : (
                <div className="mic-status">
                  {hasData
                    ? mode === 'speech'
                      ? `✅ Transcribed ${formattedTime} — Ready to process`
                      : `✅ Recorded ${formattedTime} — Ready to upload`
                    : `Tap the mic to start ${mode === 'speech' ? 'listening' : 'recording'}`}
                </div>
              )}
            </div>

            {/* Live Transcript Preview (Speech mode) */}
            {mode === 'speech' && (speech.isListening || speech.hasTranscript) && (
              <div
                style={{
                  marginTop: 'var(--space-lg)',
                  width: '100%',
                  padding: 'var(--space-md)',
                  background: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>
                  📝 Live Transcript
                </div>
                <span style={{ color: 'var(--text-primary)' }}>{speech.transcript}</span>
                {speech.interimText && (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {' '}{speech.interimText}
                  </span>
                )}
                {!speech.transcript && !speech.interimText && (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Waiting for speech...
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {hasData && !isActive && !processing && (
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={mode === 'speech' ? handleSubmitText : handleUploadAudio}
                >
                  🚀 {mode === 'speech' ? 'Process Text' : 'Process Recording'}
                </button>
                <button className="btn btn-secondary btn-lg" onClick={handleDiscard}>
                  🗑️ Discard
                </button>
              </div>
            )}

            {/* Processing */}
            {processing && (
              <div
                style={{
                  marginTop: 'var(--space-lg)',
                  textAlign: 'center',
                  color: 'var(--text-accent)',
                }}
              >
                <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
                <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.9rem' }}>
                  {mode === 'speech'
                    ? 'Extracting business data from text...'
                    : 'Transcribing & extracting business data...'}
                </p>
              </div>
            )}

            {/* Error */}
            {(error || hookError) && (
              <div
                style={{
                  marginTop: 'var(--space-md)',
                  color: 'var(--danger-400)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              >
                ❌ {error || hookError}
              </div>
            )}

            {/* Not supported warning */}
            {mode === 'speech' && !speech.isSupported && (
              <div
                style={{
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '0.82rem',
                  color: 'var(--warning-400)',
                  textAlign: 'center',
                }}
              >
                ⚠️ Web Speech API not supported. Switch to <b>Audio Upload</b> or <b>Manual Entry</b> mode.
              </div>
            )}
          </div>

          {/* Tips */}
          {!result && (
            <div className="glass-card">
              <h3 className="section-title">💡 Tips for Best Results</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                {[
                  { emoji: '🗣️', text: 'Speak clearly with item names and prices' },
                  { emoji: '📋', text: '"50 samose beche 10 rupaye mein"' },
                  { emoji: '💸', text: 'Mention expenses: "200 ka tel kharida"' },
                  { emoji: '📉', text: 'Say "khatam ho gaya" for sold-out items' },
                ].map((tip) => (
                  <div key={tip.text} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.3rem' }}>{tip.emoji}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result (fallback — only shows if review mode didn't activate) */}
          {result && result.extraction && !reviewMode && !manualSaved && (
            <div className="glass-card animate-fadeInUp">
              <h3 className="section-title">✅ Extracted Data</h3>

              {/* Phase 4 Feature 7: Anomaly Alert */}
              {result.anomaly && <AnomalyAlert anomaly={result.anomaly} />}

              {/* Items */}
              {result.extraction.items?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                    💰 Items Sold
                  </h4>
                  {result.extraction.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.88rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        {item.isApproximate && (
                          <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '2px 5px' }} title={item.clarificationNeeded || 'Approximate value'}>~approx</span>
                        )}
                        {item.needsConfirmation && (
                          <span className="badge badge-info" style={{ fontSize: '0.6rem', padding: '2px 5px' }} title={item.clarificationNeeded || 'Needs confirmation'}>?</span>
                        )}
                        {item.confidence < 0.7 && !item.isApproximate && (
                          <span title="Low confidence"> ⚠️</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span style={{ fontWeight: 600 }}>₹{item.totalPrice}</span>
                        {audioPlayback.hasAudio && item.audioTimestamp?.startTime != null && (
                          <button
                            onClick={() => audioPlayback.play(`item-${i}`, item.audioTimestamp.startTime, item.audioTimestamp.endTime)}
                            style={{ background: audioPlayback.currentItemId === `item-${i}` ? 'rgba(99,102,241,0.2)' : 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-accent)' }}
                            title={`Hear: "${item.audioTimestamp.sourcePhrase || item.sourcePhrase || ''}"`}
                          >
                            {audioPlayback.currentItemId === `item-${i}` ? '⏸' : '🔊'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expenses */}
              {result.extraction.expenses?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                    💸 Expenses
                  </h4>
                  {result.extraction.expenses.map((exp, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.88rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <span>{exp.description || exp.category}</span>
                        {exp.isApproximate && (
                          <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>~approx</span>
                        )}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--danger-400)' }}>-₹{exp.amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Missed Profits */}
              {result.extraction.missedProfits?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                    📉 Missed Profits
                  </h4>
                  {result.extraction.missedProfits.map((mp, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                      <span>{mp.item}: ~₹{mp.estimatedLoss}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                        &quot;{mp.triggerPhrase}&quot;
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div
                style={{
                  padding: 'var(--space-md)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-around',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success-400)' }}>
                    ₹{result.entry?.totalRevenue || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expenses</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--danger-400)' }}>
                    ₹{result.entry?.totalExpenses || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profit</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    ₹{result.entry?.netProfit || 0}
                  </div>
                </div>
              </div>

              {/* Clarification hint */}
              {result.entry?.hasPendingClarifications && (
                <div style={{
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: 'var(--warning-400)',
                  textAlign: 'center',
                }}>
                  🔍 Some items were approximate — we&apos;ll ask you to confirm next time you open the app
                </div>
              )}

              {/* Record another */}
              <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setResult(null);
                    setError('');
                  }}
                >
                  🎙️ Record Another
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

