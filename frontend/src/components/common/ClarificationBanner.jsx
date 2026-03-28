/**
 * ClarificationBanner — Phase 4 Feature 6
 *
 * Non-intrusive modal/banner that appears on app open when there are
 * items or expenses that were flagged as approximate or needing confirmation.
 *
 * Prompts the vendor with a simple yes/no or fill-in flow to resolve
 * uncertain data without dropping it.
 *
 * Usage:
 *   <ClarificationBanner vendorId={vendorId} />
 */

import { useState, useEffect, useCallback } from 'react';
import { ledgerAPI } from '../../api';

export default function ClarificationBanner({ vendorId }) {
  const [clarifications, setClarifications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch pending clarifications on mount
  useEffect(() => {
    if (!vendorId) return;

    const fetchClarifications = async () => {
      try {
        const res = await ledgerAPI.getPendingClarifications(vendorId);
        const items = res.data.data || [];
        if (items.length > 0) {
          setClarifications(items);
          setIsVisible(true);
        }
      } catch (err) {
        // Silently fail — banner is non-intrusive
        console.warn('[Clarification] Failed to fetch:', err.message);
      }
    };

    // Slight delay so it doesn't block initial render
    const timer = setTimeout(fetchClarifications, 1500);
    return () => clearTimeout(timer);
  }, [vendorId]);

  const current = clarifications[currentIndex];

  // Handle "Yes, this is correct" — confirm the AI guess
  const handleConfirm = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    try {
      await ledgerAPI.resolveClarification(current.entryId, {
        itemId: current.itemId,
        type: current.type,
        action: 'confirm',
      });
      moveToNext();
    } catch (err) {
      console.error('[Clarification] Confirm error:', err);
    } finally {
      setLoading(false);
    }
  }, [current, currentIndex]);

  // Handle "Update value" — vendor provides corrected number
  const handleUpdate = useCallback(async () => {
    if (!current || !editValue) return;
    setLoading(true);

    const numVal = parseFloat(editValue);
    if (isNaN(numVal) || numVal < 0) {
      setLoading(false);
      return;
    }

    try {
      const resolvedValue = current.type === 'item'
        ? { quantity: numVal, totalPrice: numVal * (current.currentValue.unitPrice || 0) }
        : { amount: numVal };

      await ledgerAPI.resolveClarification(current.entryId, {
        itemId: current.itemId,
        type: current.type,
        action: 'update',
        resolvedValue,
      });
      moveToNext();
    } catch (err) {
      console.error('[Clarification] Update error:', err);
    } finally {
      setLoading(false);
      setEditValue('');
    }
  }, [current, currentIndex, editValue]);

  // Move to next clarification or dismiss
  const moveToNext = () => {
    if (currentIndex + 1 < clarifications.length) {
      setCurrentIndex((i) => i + 1);
      setEditValue('');
    } else {
      setIsVisible(false);
    }
  };

  // Skip this clarification
  const handleSkip = () => {
    moveToNext();
  };

  // Dismiss the entire banner
  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !current) return null;

  const dateStr = new Date(current.entryDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  });

  return (
    <div
      className="animate-fadeInUp"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(90vw, 440px)',
        zIndex: 1000,
      }}
    >
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1))',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: 'var(--space-lg)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span style={{ fontSize: '1.1rem' }}>🔍</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Quick check ({currentIndex + 1}/{clarifications.length}) · {dateStr}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '1.1rem', padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Question */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
            {current.clarificationNeeded || (
              current.type === 'item'
                ? `You said "${current.sourcePhrase || current.name}" — is ${current.currentValue.quantity} units correct?`
                : `₹${current.currentValue.amount} for ${current.name} — is this right?`
            )}
          </div>

          {/* Current value badge */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
              {current.type === 'item'
                ? `${current.name} × ${current.currentValue.quantity} = ₹${current.currentValue.totalPrice}`
                : `${current.name}: ₹${current.currentValue.amount}`}
            </span>
            {current.isApproximate && (
              <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                ~Approximate
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Yes / Confirm */}
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
            onClick={handleConfirm}
            disabled={loading}
          >
            ✅ Yes, correct
          </button>

          {/* Quick edit input */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number"
              placeholder={current.type === 'item' ? 'Qty' : '₹ Amount'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={{
                width: 80,
                padding: '5px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            />
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 10px' }}
              onClick={handleUpdate}
              disabled={loading || !editValue}
            >
              Fix
            </button>
          </div>

          {/* Skip */}
          <button
            onClick={handleSkip}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
