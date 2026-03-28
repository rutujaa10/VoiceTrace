/**
 * Ledger View — Daily business entries list
 */

import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { ledgerAPI } from '../api';

export default function Ledger() {
  const { state } = useApp();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

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
          📒 <span className="gradient-text">Business Ledger</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your daily sales history
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
          <h3>No Entries Yet</h3>
          <p>Start recording your sales to see them here!</p>
        </div>
      ) : (
        <>
          {/* Entries as Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {entries.map((entry) => (
              <div key={entry._id} className="glass-card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
                      {formatDate(entry.date)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {entry.items?.length || 0} items · {entry.language}
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

                {/* Items Preview */}
                {entry.items && entry.items.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                    {entry.items.slice(0, 5).map((item, i) => (
                      <span key={i} className="badge badge-info">
                        {item.name} × {item.quantity}
                      </span>
                    ))}
                    {entry.items.length > 5 && (
                      <span className="badge badge-info">+{entry.items.length - 5} more</span>
                    )}
                  </div>
                )}

                {/* Missed Profits */}
                {entry.missedProfits && entry.missedProfits.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-400)', marginBottom: 'var(--space-sm)' }}>
                    📉 Missed: {entry.missedProfits.map((mp) => `${mp.item} (~₹${mp.estimatedLoss})`).join(', ')}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className={`badge ${entry.confirmedByVendor ? 'badge-success' : 'badge-warning'}`}
                  >
                    {entry.confirmedByVendor ? '✅ Confirmed' : '⏳ Pending'}
                  </span>
                  {!entry.confirmedByVendor && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      onClick={() => handleConfirm(entry._id)}
                    >
                      Confirm ✓
                    </button>
                  )}
                </div>
              </div>
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
