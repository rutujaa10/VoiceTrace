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

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, actionTypes } from '../state/AppContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { ledgerAPI } from '../api';
import AnomalyAlert from '../components/common/AnomalyAlert';
import {
  Plus, Trash2, Save, ShoppingBag, TrendingDown,
  Loader2, CheckCircle, RotateCcw, Edit3, ArrowRight,
  Mic, FileAudio, Zap, Square, AlertTriangle, AlertCircle, Lightbulb, MessageSquare, IndianRupee, Rocket, Sparkles, FileText
} from 'lucide-react';
import ReviewForm from '../components/ledger/ReviewForm';

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi', short: 'hi' },
  { code: 'en-IN', label: 'English', short: 'en' },
  { code: 'mr-IN', label: 'Marathi', short: 'mr' },
  { code: 'gu-IN', label: 'Gujarati', short: 'gu' },
  { code: 'kn-IN', label: 'Kannada', short: 'kn' },
  { code: 'ta-IN', label: 'Tamil', short: 'ta' },
  { code: 'te-IN', label: 'Telugu', short: 'te' },
];

const EMPTY_ITEM = { name: '', quantity: '1', unitPrice: '', totalPrice: '' };
const EMPTY_EXPENSE = { description: '', category: 'raw_material', amount: '' };

export default function Record() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // ---- Handle autoStart from Dashboard ----
  useEffect(() => {
    if (searchParams.get('autoStart') === 'true') {
      const timer = setTimeout(() => {
        if (!isActive && !processing) {
          handleToggle();
        }
      }, 400);
      setSearchParams({});
      return () => clearTimeout(timer);
    }
  }, [searchParams, handleToggle, setSearchParams, isActive, processing]);

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
      const res = await ledgerAPI.uploadAudio(state.vendorId, recorder.audioBlob, lang.short);
      const data = res.data.data;
      // Audio upload now returns extraction (via save=false) or saved entry.
      // We'll populate review form, and keep audioUrl & wordTimestamps to save via manual entry.
      if (data.extraction) {
        populateReviewForm(data.extraction);
        setReviewSource('audio');
        // Store audio context in state so we can pass it to manual entry
        setResult(data);
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

  // ---- Submit manual entry ----
  const handleManualSubmit = async ({ items: validItems, expenses: validExpenses }) => {

    if (validItems.length === 0 && validExpenses.length === 0) {
      setError('Add at least one item or expense');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const reqData = {
        items: validItems,
        expenses: validExpenses,
      };

      if (reviewSource === 'audio' && result?.audioUrl) {
        reqData.audioUrl = result.audioUrl;
        reqData.wordTimestamps = result.wordTimestamps;
      }

      const res = await ledgerAPI.manualEntry(state.vendorId, reqData);
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
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.2rem, 5vw, 1.75rem)',
            fontWeight: 800,
          }}
        >
          <Mic size={24} style={{ display: 'inline', color: 'var(--primary-500)', verticalAlign: 'text-bottom', marginRight: '6px' }} /> <span className="gradient-text">Record Sales</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
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
            display: 'flex',
            flexWrap: 'wrap',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            gap: '2px',
          }}
        >
          <button
            className={`btn btn-sm ${mode === 'speech' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('speech'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.75rem', padding: '6px 10px', flex: '1 1 auto', minWidth: '0' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Zap size={13} /> Live Speech</span>
          </button>
          <button
            className={`btn btn-sm ${mode === 'audio' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('audio'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.75rem', padding: '6px 10px', flex: '1 1 auto', minWidth: '0' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><FileAudio size={13} /> Audio</span>
          </button>
          <button
            className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('manual'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.75rem', padding: '6px 10px', flex: '1 1 auto', minWidth: '0' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Edit3 size={13} /> Manual</span>
          </button>
        </div>

        {/* Language toggle (Speech mode only) */}
        {mode === 'speech' && (
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              padding: '4px',
              borderRadius: 'var(--radius-lg)',
              gap: '2px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`btn btn-sm ${lang.code === l.code ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setLang(l)}
                disabled={speech.isListening}
                style={{ fontSize: '0.72rem', padding: '5px 8px', whiteSpace: 'nowrap' }}
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
          {mode === 'speech' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Zap size={10} /> Free — Browser STT</span> : mode === 'audio' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileAudio size={10} /> Whisper API</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit3 size={10} /> Type items & expenses</span>}
        </span>
      </div>

      {/* ═══════════ EDITABLE FORM (Manual Entry OR AI Review) ═══════════ */}
      {((mode === 'manual' && !manualSaved) || reviewMode) && (
        <ReviewForm
          initialItems={manualItems}
          initialExpenses={manualExpenses}
          reviewSource={reviewSource}
          processing={processing}
          error={error}
          reviewMode={reviewMode}
          onSave={handleManualSubmit}
          onDiscard={handleDiscard}
        />
      )}

      {/* Saved State — shows after any mode saves */}
      {manualSaved && result && (
        <div className="animate-[fadeIn_0.4s_ease]" style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={40} style={{ color: 'var(--primary-500)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: '6px' }}>Saved Successfully! <Sparkles size={20} style={{ display: 'inline', color: 'var(--primary-500)' }} /></h2>
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
          {/* New Central Voice Interaction Area */}
          <div
            className={`voice-area-container ${processing ? 'voice-state-processing' : isActive ? 'voice-state-listening' : 'voice-state-idle'} glass-card`}
            style={{ marginBottom: 'var(--space-xl)', border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-glass)' }}
          >
            {isActive && !processing && (
              <>
                <div className="listening-ring"></div>
                <div className="listening-ring delay"></div>
              </>
            )}

            <button
              className="voice-btn-core"
              onClick={handleToggle}
              disabled={processing}
              aria-label={isActive ? 'Stop recording' : 'Start recording'}
            >
              {processing ? (
                <div className="processing-dots" style={{ display: 'flex', gap: '4px', position: 'absolute' }}>
                  <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></span>
                  <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></span>
                  <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></span>
                </div>
              ) : isActive ? (
                <Square size={32} />
              ) : (
                <Mic size={48} />
              )}
            </button>

            {isActive && !processing && (
              <div className="waveform-container" style={{ position: 'absolute', top: '24px' }}>
                <div className="waveform-bar"></div>
                <div className="waveform-bar"></div>
                <div className="waveform-bar"></div>
                <div className="waveform-bar"></div>
                <div className="waveform-bar"></div>
              </div>
            )}

            <div className="voice-labels">
              {processing ? (
                <>
                  <div className="voice-label-primary">{t('record.processing')}</div>
                  <div className="voice-label-secondary" style={{ color: 'var(--primary-400)' }}>{t('record.processing')}</div>
                </>
              ) : isActive ? (
                <>
                  <div className="voice-label-primary animate-pulse" style={{ color: 'var(--danger-400)' }}>{t('record.stopRecording')}</div>
                  <div className="voice-label-secondary">{formattedTime} • {t('record.stopRecording')}</div>
                </>
              ) : (
                <>
                   <div className="voice-label-primary">{t('record.startRecording')}</div>
                   <div className="voice-label-secondary">
                     {hasData ? (
                       mode === 'speech'
                         ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success-400)' }}><CheckCircle size={14} /> Transcribed {formattedTime}</span>
                         : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success-400)' }}><CheckCircle size={14} /> Recorded {formattedTime}</span>
                     ) : t('record.hint')}
                   </div>
                </>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileText size={12} /> Live Transcript</span>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Rocket size={16} /> {mode === 'speech' ? 'Process Text' : 'Process Recording'}</span>
                </button>
                <button className="btn btn-secondary btn-lg" onClick={handleDiscard}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Trash2 size={16} /> Discard</span>
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
                <div style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }}><Loader2 size={32} /></div>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> {error || hookError}</span>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> Web Speech API not supported. Switch to <b>Audio Upload</b> or <b>Manual Entry</b> mode.</span>
              </div>
            )}
          </div>

          {/* Tips */}
          {!result && (
            <div className="glass-card">
              <h3 className="section-title"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Lightbulb size={20} style={{ color: 'var(--primary-500)' }} /> Tips for Best Results</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 'var(--space-md)' }}>
                {[
                  { icon: <MessageSquare size={20} />, text: 'Speak clearly with item names and prices' },
                  { icon: <FileText size={20} />, text: '"50 samose beche 10 rupaye mein"' },
                  { icon: <IndianRupee size={20} />, text: 'Mention expenses: "200 ka tel kharida"' },
                  { icon: <TrendingDown size={20} />, text: 'Say "khatam ho gaya" for sold-out items' },
                ].map((tip) => (
                  <div key={tip.text} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--primary-500)' }}>{tip.icon}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result (fallback — only shows if review mode didn't activate) */}
          {result && result.extraction && !reviewMode && !manualSaved && (
            <div className="glass-card animate-fadeInUp">
              <h3 className="section-title"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={20} style={{ color: 'var(--success-400)' }} /> Extracted Data</span></h3>

              {/* Phase 4 Feature 7: Anomaly Alert */}
              {result.anomaly && <AnomalyAlert anomaly={result.anomaly} />}

              {/* Items */}
              {result.extraction.items?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ShoppingBag size={14} /> Items Sold</span>
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
                          <span title="Low confidence" style={{ marginLeft: '4px' }}><AlertTriangle size={12} style={{ display: 'inline', color: 'var(--warning-400)' }} /></span>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={14} /> Expenses</span>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={14} /> Missed Profits</span>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={14} /> Some items were approximate — we&apos;ll ask you to confirm next time you open the app</span>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Mic size={16} /> Record Another</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

