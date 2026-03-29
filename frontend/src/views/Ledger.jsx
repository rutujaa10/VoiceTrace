/**
 * Ledger View — Daily business entries list (Enhanced)
 *
 * Enhanced with:
 * - Phase 4 Feature 6: Shows approximate/needsConfirmation badges on items
 * - Phase 4 Feature 7: Anomaly alert per entry
 * - Phase 4 Feature 8: Audio playback per item (tap to hear original audio)
 */

import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { ledgerAPI } from '../api';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { BookOpen, Volume2, TrendingDown, CheckCircle, Clock } from 'lucide-react';

export default function Ledger() {
  const { state } = useApp();
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
      const realEntries = res.data.data || [];
      
      // Inject dummy data for demonstration
      const dummyEntries = [
        {
          _id: 'dummy1',
          date: new Date().toISOString(),
          language: 'hi',
          totalRevenue: 1250,
          netProfit: 900,
          confirmedByVendor: true,
          items: [
            { _id: 'i1', name: 'Samosa', quantity: 50, isApproximate: false, needsConfirmation: false },
            { _id: 'i2', name: 'Chai', quantity: 30, isApproximate: false, needsConfirmation: false },
            { _id: 'i3', name: 'Vada Pav', quantity: 20, isApproximate: true, needsConfirmation: true }
          ],
          expenses: [
            { _id: 'e1', description: 'Oil & Spices', amount: 250, isApproximate: false },
            { _id: 'e2', description: 'Tea leaves', amount: 100, isApproximate: false },
          ],
          rawTranscript: "Aaj maine 50 samosa aur 30 chai bechi. Vada pav shayad 20 bik gaye honge. Kharcha bas tel masale ka 250 aur chai patti ka 100 hua.",
          hasPendingClarifications: true
        },
        {
          _id: 'dummy2',
          date: new Date(Date.now() - 86400000).toISOString(),
          language: 'hi',
          totalRevenue: 950,
          netProfit: 600,
          confirmedByVendor: true,
          items: [
            { _id: 'i4', name: 'Kachori', quantity: 40, isApproximate: false, needsConfirmation: false },
            { _id: 'i5', name: 'Chai', quantity: 25, isApproximate: false, needsConfirmation: false }
          ],
          expenses: [
            { _id: 'e3', description: 'Flour', amount: 350, isApproximate: false }
          ],
          rawTranscript: "Kal kachori 40 biki, chai 25 cup. Aur maida laya 350 ka.",
          hasPendingClarifications: false
        },
        {
          _id: 'dummy3',
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          language: 'en',
          totalRevenue: 2800,
          netProfit: 2100,
          confirmedByVendor: false,
          items: [
            { _id: 'i6', name: 'Samosa', quantity: 150, isApproximate: false, needsConfirmation: false },
            { _id: 'i7', name: 'Jalebi', quantity: 2, isApproximate: true, needsConfirmation: true }
          ],
          expenses: [
            { _id: 'e4', description: 'Sugar & Oil', amount: 700, isApproximate: false }
          ],
          anomaly: {
             detected: true,
             reason: "Unusually high sales volume for Samosa compared to your average.",
             severity: "info"
          },
          rawTranscript: "Today was very busy. Sold 150 samosas and around 2 kilos of Jalebi. Expenses for sugar and oil were 700 rupees.",
          hasPendingClarifications: true
        }
      ];

      const combined = [...realEntries];
      if (realEntries.length < 3) {
        const existingIds = new Set(realEntries.map(e => e._id));
        dummyEntries.forEach(d => {
          if (!existingIds.has(d._id)) combined.push(d);
        });
      }

      setEntries(combined);
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
    <div className="max-w-4xl mx-auto px-4 stagger-children">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          <BookOpen size={24} style={{ display: 'inline', color: 'var(--text-primary)', verticalAlign: 'text-bottom', marginRight: '8px' }} /><span className="gradient-text">Business Ledger</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Your daily sales history — tap items to hear original audio
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
          <div className="empty-icon"><BookOpen size={40} style={{ color: 'var(--text-muted)' }} /></div>
          <h3>No Entries Yet</h3>
          <p>Start recording your sales to see them here!</p>
        </div>
      ) : (
        <>
          {/* Entries as Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Main Table Header Row */}
            <div className="hidden md:grid gap-4 px-6 text-[0.68rem] font-bold text-muted uppercase tracking-wider" style={{ gridTemplateColumns: '1.2fr 2fr 1.5fr 1.5fr 1.2fr', marginBottom: '2px' }}>
              <div>DATE</div>
              <div>OVERVIEW</div>
              <div style={{ textAlign: 'left' }}>STATUS</div>
              <div>BALANCE</div>
              <div style={{ textAlign: 'right' }}>ACTIONS</div>
            </div>
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
                ← Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {page} of {pagination.pages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
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

  // Play audio helper for the entire entry or specific item
  const handlePlayAudio = (e, index, startTime, endTime) => {
    e.stopPropagation();
    if (audioPlayback.hasAudio && startTime != null) {
      audioPlayback.play(`item-${entry._id}-${index}`, startTime, endTime);
    }
  };

  return (
    <div style={{
      padding: 0, borderRadius: '14px', overflow: 'hidden',
      border: isExpanded ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-subtle)',
      boxShadow: isExpanded ? '0 8px 24px -4px rgba(34,197,94,0.08)' : '0 1px 4px rgba(0,0,0,0.02)',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}>
      {/* Left accent bar for expanded state */}
      {isExpanded && (
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: 'var(--gradient-primary)', zIndex: 1 }} />
      )}

      {/* ═══ Main Table Row ═══ */}
      <div
        className="flex flex-col md:grid md:items-center gap-4 px-6 py-4 cursor-pointer"
        style={{
          gridTemplateColumns: '1.2fr 2fr 1.5fr 1.5fr 1.2fr',
          background: isExpanded ? 'rgba(34,197,94,0.02)' : 'var(--bg-card)',
          transition: 'background 0.2s ease'
        }}
        onClick={onToggle}
        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(0,0,0,0.008)' }}
        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-card)' }}
      >
        {/* Col 1: Date */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {formatDate(entry.date)}
          </div>
        </div>

        {/* Col 2: Overview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--success-500)', flexShrink: 0
          }}>
            <BookOpen size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {entry.items?.length || 0} Items
            </div>
            {audioPlayback.hasAudio && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                <Volume2 size={10} /> Audio
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Status */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '5px 14px', borderRadius: '20px',
            fontSize: '0.72rem', fontWeight: 600,
            background: entry.confirmedByVendor
              ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))'
              : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))',
            color: entry.confirmedByVendor ? '#16a34a' : '#d97706',
            border: entry.confirmedByVendor ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(245,158,11,0.15)'
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: entry.confirmedByVendor ? '#22c55e' : '#f59e0b' }} />
            {entry.confirmedByVendor ? 'Verified' : 'Pending'}
          </div>
        </div>

        {/* Col 4: Balance */}
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            ₹{(entry.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '1px' }}>
            +₹{(entry.netProfit || 0).toLocaleString('en-IN')} profit
          </div>
        </div>

        {/* Col 5: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          {!entry.confirmedByVendor && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirm(); }}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '7px 16px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 8px -2px rgba(34,197,94,0.3)'
              }}
              onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 12px -2px rgba(34,197,94,0.4)' }}
              onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 2px 8px -2px rgba(34,197,94,0.3)' }}
            >
              ✓ Verify
            </button>
          )}
          <button
            style={{
              background: isExpanded ? 'var(--bg-secondary)' : 'transparent',
              color: isExpanded ? 'var(--text-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px', padding: '7px 14px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'var(--bg-secondary)'; e.target.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { if (!isExpanded) { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-muted)' } }}
          >
            {isExpanded ? '✕ Close' : '→ View'}
          </button>
        </div>
      </div>

      {/* ═══ Expanded Items Table ═══ */}
      {isExpanded && (
        <div style={{ padding: '20px 28px 24px', borderTop: '1px solid rgba(34,197,94,0.1)', background: 'rgba(34,197,94,0.01)' }}>

          {/* Section title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: 4, height: 16, borderRadius: '2px', background: 'var(--gradient-primary)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Itemized Breakdown
            </span>
          </div>

          {/* Items Header */}
          <div className="hidden md:grid gap-4 text-[0.65rem] text-muted mb-2 px-3 uppercase tracking-wider" style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1fr', fontWeight: 700, color: 'var(--text-muted)' }}>
            <div>ITEM</div>
            <div>QTY</div>
            <div>STATUS</div>
            <div style={{ textAlign: 'right' }}>ACTION</div>
          </div>

          {/* Items Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
            {entry.items?.map((item, i) => (
              <div
                key={item._id || i}
                className="grid items-center gap-4 px-3 py-3"
                style={{
                  gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
                  borderRadius: '10px',
                  background: i % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.04)'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'transparent'}
              >
                {/* Item Name */}
                <div
                   style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: audioPlayback.hasAudio ? 'pointer' : 'default' }}
                   onClick={(e) => handlePlayAudio(e, i, item.audioTimestamp?.startTime, item.audioTimestamp?.endTime)}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 6px rgba(34,197,94,0.3)' }} />
                  <span style={{ textTransform: 'capitalize' }}>{item.name}</span>
                  {audioPlayback.currentItemId === `item-${entry._id}-${i}` && <Volume2 size={12} style={{ color: 'var(--success-500)' }} />}
                </div>

                {/* Quantity */}
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {item.quantity} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>units</span>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  {item.isApproximate ? (
                    <span style={{ color: '#d97706', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.1)' }}>
                      ≈ Approx
                    </span>
                  ) : (
                    <span style={{ color: '#16a34a', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(34,197,94,0.08)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(34,197,94,0.1)' }}>
                      ✓ Exact
                    </span>
                  )}
                </div>

                {/* Remove Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                        padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        opacity: removingId === (item._id || i) ? 0.5 : 1, transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.06)'; e.target.style.borderColor = 'rgba(239, 68, 68, 0.25)' }}
                      onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(239, 68, 68, 0.15)' }}
                    >
                      {removingId === (item._id || i) ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Expenses Breakdown */}
          {entry.expenses?.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: '8px' }}>
                <div style={{ width: 4, height: 16, borderRadius: '2px', background: 'linear-gradient(135deg, #ef4444, #f97316)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Expenses
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {entry.expenses.map((exp, i) => (
                  <div key={exp._id || i} className="grid items-center gap-4 px-3 py-3" style={{
                    gridTemplateColumns: '2fr 1fr 1.5fr 1fr', borderRadius: '10px',
                    background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.06)'
                  }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                       <TrendingDown size={13} style={{ color: '#ef4444' }} /> {exp.description || exp.category}
                     </div>
                     <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>-₹{exp.amount}</div>
                     <div>
                       <span style={{ color: '#dc2626', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(239,68,68,0.08)', padding: '3px 10px', borderRadius: '20px' }}>Expense</span>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       {isEditable && (
                         <button
                           onClick={(e) => { e.stopPropagation(); setRemovingId(exp._id); onRemoveExpense(exp._id).finally(() => setRemovingId(null)); }}
                           style={{ color: '#ef4444', background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                           onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.06)'}
                           onMouseLeave={(e) => e.target.style.background = 'transparent'}
                         >Remove</button>
                       )}
                     </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Transcript Details */}
          {entry.rawTranscript && (
             <div style={{
               fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic',
               background: 'linear-gradient(135deg, rgba(34,197,94,0.03), rgba(16,185,129,0.02))',
               padding: '16px 20px', borderRadius: '12px',
               marginTop: '8px', border: '1px solid rgba(34,197,94,0.08)'
             }}>
               <div style={{ fontWeight: 700, color: 'var(--success-500)', marginBottom: '6px', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontStyle: 'normal', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <Volume2 size={12} /> Original Transcript
               </div>
               &quot;{entry.rawTranscript}&quot;
             </div>
          )}
        </div>
      )}
    </div>
  );
}
