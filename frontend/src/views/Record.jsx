/**
 * Record View — Voice-to-Ledger with dual mode (Enhanced)
 *
 * Mode 1 (default): Web Speech API — free, real-time browser transcription
 * Mode 2 (fallback): Audio Recording → Whisper — better accuracy, word timestamps
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
import { Mic, Square, Zap, Music, Send, Trash2, Settings, XCircle, AlertTriangle, Lightbulb, CheckCircle, FileText, DollarSign, CreditCard, TrendingDown, Search, Volume2, Pause, Loader } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi', short: 'hi' },
  { code: 'en-IN', label: 'English', short: 'en' },
];

export default function Record() {
  const { state, dispatch } = useApp();

  // Mode toggle
  const [mode, setMode] = useState('speech'); // 'speech' | 'audio'
  const [lang, setLang] = useState(LANGUAGES[0]);

  // Web Speech API hook
  const speech = useVoiceRecorder({ lang: lang.code, maxDurationSeconds: 180 });

  // Audio recording fallback hook
  const recorder = useAudioRecorder(180);

  // Shared UI state
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Phase 4 Feature 8: Audio playback for items
  const audioPlayback = useAudioPlayback(result?.entry?.audioUrl);

  const isActive = mode === 'speech' ? speech.isListening : recorder.isRecording;

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
    } else {
      if (recorder.isRecording) {
        recorder.stopRecording();
      } else {
        setResult(null);
        recorder.startRecording();
      }
    }
  }, [mode, speech, recorder]);

  // ---- Submit transcript (Web Speech mode) ----
  const handleSubmitText = async () => {
    if (!speech.hasTranscript) return;

    setProcessing(true);
    setError('');
    try {
      const res = await ledgerAPI.submitText(
        state.vendorId,
        speech.transcript,
        lang.short
      );
      setResult(res.data.data);

      if (res.data.data.loanReadiness) {
        dispatch({
          type: actionTypes.SET_LOAN_SCORE,
          payload: res.data.data.loanReadiness,
        });
      }

      speech.resetTranscript();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ---- Upload audio blob (Whisper mode) ----
  const handleUploadAudio = async () => {
    if (!recorder.audioBlob) return;

    setProcessing(true);
    setError('');
    try {
      const res = await ledgerAPI.uploadAudio(state.vendorId, recorder.audioBlob);
      setResult(res.data.data);

      if (res.data.data.loanReadiness) {
        dispatch({
          type: actionTypes.SET_LOAN_SCORE,
          payload: res.data.data.loanReadiness,
        });
      }

      recorder.resetRecording();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ---- Reset everything ----
  const handleDiscard = () => {
    if (mode === 'speech') {
      speech.resetTranscript();
    } else {
      recorder.resetRecording();
    }
    setResult(null);
    setError('');
  };

  const hasData = mode === 'speech' ? speech.hasTranscript : !!recorder.audioBlob;
  const formattedTime = mode === 'speech' ? speech.formattedTime : recorder.formattedTime;
  const hookError = mode === 'speech' ? speech.error : recorder.error;

  return (
    <div className="stagger-children">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          <Mic size={28} style={{ color: 'var(--primary-500)' }} /> <span className="gradient-text">Record Sales</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Speak naturally — Hindi, English, or Hinglish
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
            style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Zap size={14} /> Live Speech
          </button>
          <button
            className={`btn btn-sm ${mode === 'audio' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('audio'); handleDiscard(); }}
            disabled={isActive}
            style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Music size={14} /> Audio Upload
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
          className={`badge ${mode === 'speech' ? 'badge-success' : 'badge-warning'}`}
          style={{ alignSelf: 'center', fontSize: '0.7rem' }}
        >
          {mode === 'speech' ? 'Free — Browser STT' : 'Whisper API — Higher accuracy'}
        </span>
      </div>

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
          {isActive ? <Square size={32} /> : <Mic size={32} />}
        </button>

        {/* Timer */}
        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
          {isActive ? (
            <>
              <div className="mic-timer">{formattedTime}</div>
              <div className="mic-status" style={{ color: 'var(--danger-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger-400)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                {mode === 'speech' ? 'Listening...' : 'Recording...'} Tap to stop
              </div>
            </>
          ) : (
            <div className="mic-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {hasData
                ? <>
                    <CheckCircle size={16} style={{ color: 'var(--success-400)' }} />
                    {mode === 'speech'
                      ? `Transcribed ${formattedTime} — Ready to process`
                      : `Recorded ${formattedTime} — Ready to upload`}
                  </>
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
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> Live Transcript
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
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={16} /> {mode === 'speech' ? 'Process Text' : 'Process Recording'}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={handleDiscard} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={16} /> Discard
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
            <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}><Loader size={32} /></div>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <XCircle size={16} /> {error || hookError}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <AlertTriangle size={16} /> Web Speech API not supported. Switch to <b>Audio Upload</b> mode
            or use Chrome / Edge browser.
          </div>
        )}
      </div>

      {/* Tips */}
      {!result && (
        <div className="glass-card">
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lightbulb size={18} style={{ color: 'var(--primary-500)' }} /> Tips for Best Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { icon: Mic, text: 'Speak clearly with item names and prices' },
              { icon: FileText, text: '"50 samose beche 10 rupaye mein"' },
              { icon: CreditCard, text: 'Mention expenses: "200 ka tel kharida"' },
              { icon: TrendingDown, text: 'Say "khatam ho gaya" for sold-out items' },
            ].map((tip) => (
              <div key={tip.text} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                <tip.icon size={20} style={{ color: 'var(--primary-500)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && result.extraction && (
        <div className="glass-card animate-fadeInUp">
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} style={{ color: 'var(--success-400)' }} /> Extracted Data</h3>

          {/* Phase 4 Feature 7: Anomaly Alert */}
          {result.anomaly && <AnomalyAlert anomaly={result.anomaly} />}

          {/* Items */}
          {result.extraction.items?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={14} /> Items Sold
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
                    {/* Phase 4 Feature 6: Confidence flags */}
                    {item.isApproximate && (
                      <span
                        className="badge badge-warning"
                        style={{ fontSize: '0.6rem', padding: '2px 5px' }}
                        title={item.clarificationNeeded || 'Approximate value'}
                      >
                        ~approx
                      </span>
                    )}
                    {item.needsConfirmation && (
                      <span
                        className="badge badge-info"
                        style={{ fontSize: '0.6rem', padding: '2px 5px' }}
                        title={item.clarificationNeeded || 'Needs confirmation'}
                      >
                        ?
                      </span>
                    )}
                    {item.confidence < 0.7 && !item.isApproximate && (
                      <AlertTriangle size={14} style={{ color: 'var(--warning-400)' }} title="Low confidence" />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontWeight: 600 }}>₹{item.totalPrice}</span>

                    {/* Phase 4 Feature 8: Audio playback button */}
                    {audioPlayback.hasAudio && item.audioTimestamp?.startTime != null && (
                      <button
                        onClick={() => audioPlayback.play(
                          `item-${i}`,
                          item.audioTimestamp.startTime,
                          item.audioTimestamp.endTime
                        )}
                        style={{
                          background: audioPlayback.currentItemId === `item-${i}` ? 'rgba(99,102,241,0.2)' : 'none',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          color: 'var(--text-accent)',
                        }}
                        title={`Hear: "${item.audioTimestamp.sourcePhrase || item.sourcePhrase || ''}"`}
                      >
                        {audioPlayback.currentItemId === `item-${i}` ? <Pause size={12} /> : <Volume2 size={12} />}
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
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={14} /> Expenses
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
                    {exp.needsConfirmation && (
                      <span className="badge badge-info" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>?</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--danger-400)' }}>-₹{exp.amount}</span>
                    {audioPlayback.hasAudio && exp.audioTimestamp?.startTime != null && (
                      <button
                        onClick={() => audioPlayback.play(
                          `exp-${i}`,
                          exp.audioTimestamp.startTime,
                          exp.audioTimestamp.endTime
                        )}
                        style={{
                          background: audioPlayback.currentItemId === `exp-${i}` ? 'rgba(99,102,241,0.2)' : 'none',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          color: 'var(--text-accent)',
                        }}
                      >
                        {audioPlayback.currentItemId === `exp-${i}` ? <Pause size={12} /> : <Volume2 size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missed Profits */}
          {result.extraction.missedProfits?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={14} /> Missed Profits
              </h4>
              {result.extraction.missedProfits.map((mp, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem',
                  }}
                >
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
              <Search size={14} /> Some items were approximate — we&apos;ll ask you to confirm next time you open the app
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Mic size={16} /> Record Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
