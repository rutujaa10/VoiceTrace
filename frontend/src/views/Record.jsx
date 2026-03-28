/**
 * Record View — Big microphone button for voice recording
 *
 * Features:
 * - Massive mic button with pulse animation when recording
 * - Timer display
 * - Auto-upload on stop
 * - Shows extracted data after processing
 */

import { useState } from 'react';
import { useApp, actionTypes } from '../state/AppContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { ledgerAPI } from '../api';

export default function Record() {
  const { state, dispatch } = useApp();
  const recorder = useAudioRecorder(180);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleToggleRecording = () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      setResult(null);
      setError('');
      recorder.startRecording();
    }
  };

  const handleUpload = async () => {
    if (!recorder.audioBlob) return;

    setProcessing(true);
    setError('');
    try {
      const res = await ledgerAPI.uploadAudio(state.vendorId, recorder.audioBlob);
      setResult(res.data.data);

      // Update loan score in global state
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

  return (
    <div className="stagger-children">
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
          Tap the mic and speak naturally — Hindi, English, or Hinglish
        </p>
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
          className={`mic-btn ${recorder.isRecording ? 'recording' : ''}`}
          onClick={handleToggleRecording}
          disabled={processing}
          aria-label={recorder.isRecording ? 'Stop recording' : 'Start recording'}
        >
          {recorder.isRecording ? '⏹️' : '🎙️'}
        </button>

        {/* Timer */}
        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
          {recorder.isRecording ? (
            <>
              <div className="mic-timer">{recorder.formattedTime}</div>
              <div className="mic-status" style={{ color: 'var(--danger-400)' }}>
                🔴 Recording... Tap to stop
              </div>
            </>
          ) : (
            <div className="mic-status">
              {recorder.audioBlob
                ? `✅ Recorded ${recorder.formattedTime} — Ready to upload`
                : 'Tap the mic to start recording'}
            </div>
          )}
        </div>

        {/* Upload Button */}
        {recorder.audioBlob && !recorder.isRecording && !processing && (
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary btn-lg" onClick={handleUpload}>
              🚀 Process Recording
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                recorder.resetRecording();
                setResult(null);
              }}
            >
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
              Transcribing & extracting business data...
            </p>
          </div>
        )}

        {/* Error */}
        {(error || recorder.error) && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              color: 'var(--danger-400)',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            ❌ {error || recorder.error}
          </div>
        )}
      </div>

      {/* How It Works */}
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

      {/* Result */}
      {result && result.extraction && (
        <div className="glass-card animate-fadeInUp">
          <h3 className="section-title">✅ Extracted Data</h3>

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
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem',
                  }}
                >
                  <span>
                    {item.name} × {item.quantity}
                    {item.confidence < 0.7 && <span title="Low confidence"> ⚠️</span>}
                  </span>
                  <span style={{ fontWeight: 600 }}>₹{item.totalPrice}</span>
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
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem',
                  }}
                >
                  <span>{exp.description || exp.category}</span>
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
        </div>
      )}
    </div>
  );
}
