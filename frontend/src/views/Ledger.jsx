/**
 * Ledger View — Daily business entries list (Enhanced)
 *
 * Enhanced with:
 * - Phase 4 Feature 6: Shows approximate/needsConfirmation badges on items
 * - Phase 4 Feature 7: Anomaly alert per entry
 * - Phase 4 Feature 8: Audio playback per item (tap to hear original audio)
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { ledgerAPI } from '../api';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AnomalyAlert from '../components/common/AnomalyAlert';

export default function Ledger() {
  const { state } = useApp();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expandedEntry, setExpandedEntry] = useState(null);

  useEffect(() => {
    if (state.vendorId) fetchEntries();
  }, [state.vendorId, page]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await ledgerAPI.getEntries(state.vendorId, { page, limit: 10 });
      setEntries(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Ledger fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (entryId) => {
    try {
      await ledgerAPI.confirmEntry(entryId, true);
      setEntries((prev) =>
        prev.map((e) =>
          e._id === entryId ? { ...e, confirmedByVendor: true } : e
        )
      );
    } catch (err) {
      console.error('Confirm error:', err);
    }
  };

  const handleRemoveItem = async (entryId, itemId) => {
    try {
      const res = await ledgerAPI.removeItem(entryId, itemId);
      if (res.data.deleted) {
        // Entry was auto-deleted because it became empty
        setEntries((prev) => prev.filter((e) => e._id !== entryId));
      } else {
        setEntries((prev) =>
          prev.map((e) => (e._id === entryId ? res.data.data : e))
        );
      }
    } catch (err) {
      if (err.response?.status === 403) {
        alert('⏰ Edit window expired! Items can only be removed within 36 hours.');
      }
      console.error('Remove item error:', err);
    }
  };

  const handleRemoveExpense = async (entryId, expenseId) => {
    try {
      const res = await ledgerAPI.removeExpense(entryId, expenseId);
      if (res.data.deleted) {
        setEntries((prev) => prev.filter((e) => e._id !== entryId));
      } else {
        setEntries((prev) =>
          prev.map((e) => (e._id === entryId ? res.data.data : e))
        );
      }
    } catch (err) {
      if (err.response?.status === 403) {
        alert('⏰ Edit window expired! Expenses can only be removed within 36 hours.');
      }
      console.error('Remove expense error:', err);
    }
  };

  // Check if an entry is within the 36-hour edit window
  const isEntryEditable = (entry) => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    const cutoff = new Date(entryDate.getTime() + 36 * 60 * 60 * 1000);
    return new Date() < cutoff;
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  return (
    <div className="stagger-children">
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          📒 <span className="gradient-text">{t('ledger.title')}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {t('ledger.subtitle')}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">📒</div>
          <h3>{t('ledger.noEntries')}</h3>
          <p>{t('ledger.noEntriesHint')}</p>
        </div>
      ) : (
        <>
          {/* Entries as Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {entries.map((entry) => (
              <LedgerEntryCard
                key={entry._id}
                entry={entry}
                isExpanded={expandedEntry === entry._id}
                isEditable={isEntryEditable(entry)}
                onToggle={() => setExpandedEntry(expandedEntry === entry._id ? null : entry._id)}
                onConfirm={() => handleConfirm(entry._id)}
                onRemoveItem={(itemId) => handleRemoveItem(entry._id, itemId)}
                onRemoveExpense={(expenseId) => handleRemoveExpense(entry._id, expenseId)}
                formatDate={formatDate}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)' }}>
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('common.previous')}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {t('common.pageOf', { page, pages: pagination.pages })}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * LedgerEntryCard — Individual entry with expandable details + audio playback
 */
function LedgerEntryCard({ entry, isExpanded, isEditable, onToggle, onConfirm, onRemoveItem, onRemoveExpense, formatDate }) {
  // Phase 4 Feature 8: Audio playback hook for this entry
  const audioPlayback = useAudioPlayback(entry.audioUrl);
  const [removingId, setRemovingId] = useState(null);

  return (
    <div className="glass-card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
            {formatDate(entry.date)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {entry.items?.length || 0} items · {entry.language}
            {entry.hasPendingClarifications && ' · 🔍 has approx values'}
            {audioPlayback.hasAudio && ' · 🔊 has audio'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--success-400)' }}>
            ₹{(entry.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Profit: ₹{(entry.netProfit || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Phase 4 Feature 7: Anomaly alert */}
      {entry.anomaly?.detected && <AnomalyAlert anomaly={entry.anomaly} />}

      {/* Items Preview (always show) */}
      {entry.items && entry.items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
          {entry.items.slice(0, isExpanded ? 999 : 5).map((item, i) => (
            <span
              key={item._id || i}
              className={`badge ${item.isApproximate ? 'badge-warning' : item.needsConfirmation ? 'badge-info' : 'badge-info'}`}
              style={{
                cursor: audioPlayback.hasAudio && item.audioTimestamp?.startTime != null ? 'pointer' : 'default',
                background: audioPlayback.currentItemId === `item-${entry._id}-${i}` ? 'rgba(99,102,241,0.3)' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                paddingRight: '4px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (audioPlayback.hasAudio && item.audioTimestamp?.startTime != null) {
                  audioPlayback.play(
                    `item-${entry._id}-${i}`,
                    item.audioTimestamp.startTime,
                    item.audioTimestamp.endTime
                  );
                }
              }}
              title={
                item.audioTimestamp?.sourcePhrase
                  ? `🔊 "${item.audioTimestamp.sourcePhrase}"`
                  : item.clarificationNeeded || `${item.name} × ${item.quantity}`
              }
            >
              {audioPlayback.currentItemId === `item-${entry._id}-${i}` ? '🔊 ' : ''}
              {item.name} × {item.quantity}
              {item.isApproximate ? ' ~' : ''}
              {item.needsConfirmation ? ' ?' : ''}
              {isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (removingId === (item._id || i)) return;
                  setRemovingId(item._id || i);
                  onRemoveItem(item._id).finally(() => setRemovingId(null));
                }}
                disabled={removingId === (item._id || i)}
                title="Remove this item"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger-400)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0 2px',
                  marginLeft: '2px',
                  lineHeight: 1,
                  opacity: removingId === (item._id || i) ? 0.4 : 0.7,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.7}
              >
                {removingId === (item._id || i) ? '...' : '✕'}
              </button>
              )}
            </span>
          ))}
          {!isExpanded && entry.items.length > 5 && (
            <span className="badge badge-info">+{entry.items.length - 5} more</span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
          {/* Expenses */}
          {entry.expenses?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>💸 Expenses</div>
              {entry.expenses.map((exp, i) => (
                <div key={exp._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '3px 0' }}>
                  <span>
                    {exp.description || exp.category}
                    {exp.isApproximate && <span style={{ color: 'var(--warning-400)' }}> ~</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--danger-400)' }}>-₹{exp.amount}</span>
                    {isEditable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (removingId === exp._id) return;
                        setRemovingId(exp._id);
                        onRemoveExpense(exp._id).finally(() => setRemovingId(null));
                      }}
                      disabled={removingId === exp._id}
                      title="Remove this expense"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger-400)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 4px',
                        opacity: removingId === exp._id ? 0.4 : 0.6,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = 1}
                      onMouseLeave={(e) => e.target.style.opacity = 0.6}
                    >
                      {removingId === exp._id ? '...' : '✕'}
                    </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missed Profits */}
          {entry.missedProfits?.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-400)', marginBottom: 'var(--space-sm)' }}>
              📉 Missed: {entry.missedProfits.map((mp) => `${mp.item} (~₹${mp.estimatedLoss})`).join(', ')}
            </div>
          )}

          {/* Raw Transcript */}
          {entry.rawTranscript && (
            <div style={{
              fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
              background: 'rgba(99,102,241,0.05)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)',
              marginTop: 'var(--space-xs)', maxHeight: 80, overflowY: 'auto',
            }}>
              📝 &quot;{entry.rawTranscript.slice(0, 200)}{entry.rawTranscript.length > 200 ? '...' : ''}&quot;
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
        <span
          className={`badge ${entry.confirmedByVendor ? 'badge-success' : 'badge-warning'}`}
        >
          {entry.confirmedByVendor ? '✅ Confirmed' : '⏳ Pending'}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          {!entry.confirmedByVendor && (
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            >
              Confirm ✓
            </button>
          )}
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '6px 8px' }}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {isExpanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      </div>
    </div>
  );
}
