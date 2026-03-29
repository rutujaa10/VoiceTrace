/**
 * Ledger View — Daily business entries list (Mobile-First)
 *
 * Enhanced with:
 * - Fully responsive mobile-first layout
 * - Card-based layout on mobile, grid on desktop
 * - Phase 4 Feature 6: Shows approximate/needsConfirmation badges on items
 * - Phase 4 Feature 7: Anomaly alert per entry
 * - Phase 4 Feature 8: Audio playback per item (tap to hear original audio)
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { ledgerAPI } from '../api';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { BookOpen, Volume2, TrendingDown, CheckCircle, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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
      setPagination(res.data.pagination || { pages: 1 });
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 4px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 5vw, 1.75rem)', fontWeight: 800 }}>
          <BookOpen size={22} style={{ display: 'inline', color: 'var(--text-primary)', verticalAlign: 'text-bottom', marginRight: '6px' }} />
          <span className="gradient-text">{t('ledger.title')}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
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
          <div><BookOpen size={40} style={{ color: 'var(--text-muted)' }} /></div>
          <h3>{t('ledger.noEntries')}</h3>
          <p>{t('ledger.noEntriesHint')}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ fontSize: '0.82rem' }}
              >
                ← {t('common.previous')}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {t('common.pageOf', { page, pages: pagination.pages })}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                style={{ fontSize: '0.82rem' }}
              >
                {t('common.next')} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * LedgerEntryCard — Mobile-first entry card with expandable details
 */
function LedgerEntryCard({ entry, isExpanded, isEditable, onToggle, onConfirm, onRemoveItem, onRemoveExpense, formatDate }) {
  const { t } = useTranslation();
  const audioPlayback = useAudioPlayback(entry.audioUrl);
  const [removingId, setRemovingId] = useState(null);

  const handlePlayAudio = (e, index, startTime, endTime) => {
    e.stopPropagation();
    if (audioPlayback.hasAudio && startTime != null) {
      audioPlayback.play(`item-${entry._id}-${index}`, startTime, endTime);
    }
  };

  return (
    <div style={{
      borderRadius: '14px', overflow: 'hidden',
      border: isExpanded ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-subtle)',
      boxShadow: isExpanded ? '0 8px 24px -4px rgba(34,197,94,0.08)' : '0 1px 4px rgba(0,0,0,0.02)',
      transition: 'all 0.3s ease',
      position: 'relative',
      background: 'var(--bg-card)',
    }}>
      {/* Left accent bar for expanded state */}
      {isExpanded && (
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: 'var(--gradient-primary)', zIndex: 1 }} />
      )}

      {/* ═══ Main Card Row ═══ */}
      <div
        onClick={onToggle}
        style={{
          padding: '14px 16px',
          background: isExpanded ? 'rgba(34,197,94,0.02)' : 'var(--bg-card)',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        {/* Top row: Date + Status + Amount */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--success-500)',
            }}>
              <BookOpen size={13} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {formatDate(entry.date)}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              ₹{(entry.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600 }}>
              +₹{(entry.netProfit || 0).toLocaleString('en-IN')} profit
            </div>
          </div>
        </div>

        {/* Bottom row: Info + Status + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {entry.items?.length || 0} Items
            </span>
            {audioPlayback.hasAudio && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Volume2 size={10} /> Audio
              </span>
            )}
            {/* Status badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '20px',
              fontSize: '0.68rem', fontWeight: 600,
              background: entry.confirmedByVendor
                ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))',
              color: entry.confirmedByVendor ? '#16a34a' : '#d97706',
              border: entry.confirmedByVendor ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(245,158,11,0.15)',
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: entry.confirmedByVendor ? '#22c55e' : '#f59e0b' }} />
              {entry.confirmedByVendor ? t('ledger.confirmed') : t('ledger.pending')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!entry.confirmedByVendor && (
              <button
                onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s', boxShadow: '0 2px 8px -2px rgba(34,197,94,0.3)',
                }}
              >
                ✓ Verify
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              style={{
                background: isExpanded ? 'var(--bg-secondary)' : 'transparent',
                color: isExpanded ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '3px',
              }}
            >
              {isExpanded ? <><ChevronUp size={12} /> Close</> : <><ChevronDown size={12} /> View</>}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Expanded Details ═══ */}
      {isExpanded && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(34,197,94,0.1)', background: 'rgba(34,197,94,0.01)' }}>

          {/* Items Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <div style={{ width: 3, height: 14, borderRadius: '2px', background: 'var(--gradient-primary)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Items Breakdown
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {entry.items?.map((item, i) => (
              <div
                key={item._id || i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: '10px', gap: '8px', flexWrap: 'wrap',
                  background: i % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'transparent',
                  cursor: audioPlayback.hasAudio ? 'pointer' : 'default',
                }}
                onClick={(e) => handlePlayAudio(e, i, item.audioTimestamp?.startTime, item.audioTimestamp?.endTime)}
              >
                {/* Item name + quantity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: '120px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 4px rgba(34,197,94,0.3)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {item.name}
                  </span>
                  {audioPlayback.currentItemId === `item-${entry._id}-${i}` && <Volume2 size={11} style={{ color: 'var(--success-500)' }} />}
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    ×{item.quantity}
                  </span>
                </div>

                {/* Status + Remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {item.isApproximate ? (
                    <span style={{ color: '#d97706', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.1)' }}>
                      ≈ Approx
                    </span>
                  ) : (
                    <span style={{ color: '#16a34a', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(34,197,94,0.08)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.1)' }}>
                      ✓ Exact
                    </span>
                  )}
                  {isEditable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (removingId === (item._id || i)) return;
                        setRemovingId(item._id || i);
                        onRemoveItem(item._id).finally(() => setRemovingId(null));
                      }}
                      disabled={removingId === (item._id || i)}
                      style={{
                        color: '#ef4444', background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
                        padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                        opacity: removingId === (item._id || i) ? 0.5 : 1, transition: 'all 0.2s',
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                      }}
                    >
                      <Trash2 size={10} /> {removingId === (item._id || i) ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Expenses */}
          {entry.expenses?.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', marginTop: '4px' }}>
                <div style={{ width: 3, height: 14, borderRadius: '2px', background: 'linear-gradient(135deg, #ef4444, #f97316)' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Expenses
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                {entry.expenses.map((exp, i) => (
                  <div key={exp._id || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '10px', gap: '8px', flexWrap: 'wrap',
                    background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', minWidth: '100px' }}>
                      <TrendingDown size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {exp.description || exp.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>-₹{exp.amount}</span>
                      {isEditable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setRemovingId(exp._id); onRemoveExpense(exp._id).finally(() => setRemovingId(null)); }}
                          style={{ color: '#ef4444', background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Trash2 size={10} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Transcript */}
          {entry.rawTranscript && (
             <div style={{
               fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic',
               background: 'linear-gradient(135deg, rgba(34,197,94,0.03), rgba(16,185,129,0.02))',
               padding: '12px 14px', borderRadius: '10px',
               marginTop: '6px', border: '1px solid rgba(34,197,94,0.08)',
             }}>
               <div style={{ fontWeight: 700, color: 'var(--success-500)', marginBottom: '4px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontStyle: 'normal', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <Volume2 size={11} /> Original Transcript
               </div>
               &quot;{entry.rawTranscript}&quot;
             </div>
          )}
        </div>
      )}
    </div>
  );
}
