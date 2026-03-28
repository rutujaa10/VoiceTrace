/**
 * Login / Onboarding View
 *
 * Simple phone number entry to register or find existing vendor.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';
import { vendorAPI } from '../api';

export default function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await vendorAPI.register({ phone, name });
      const vendor = res.data.data;

      dispatch({ type: actionTypes.SET_VENDOR, payload: vendor });
      dispatch({ type: actionTypes.SET_VENDOR_ID, payload: vendor._id });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gradient-hero)',
        padding: 'var(--space-md)',
      }}
    >
      <div
        className="glass-card animate-fadeInUp"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 'var(--space-2xl)',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
          🎙️
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: 'var(--space-sm)',
          }}
        >
          <span className="gradient-text">VoiceTrace</span>
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: 'var(--space-xl)',
          }}
        >
          Apni awaaz se business sambhalein
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <input
              id="phone-input"
              type="tel"
              placeholder="📱 Phone Number (e.g. 9876543210)"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={15}
              style={{
                width: '100%',
                padding: '14px var(--space-md)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary-500)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-glass)')}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <input
              id="name-input"
              type="text"
              placeholder="👤 Your Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              style={{
                width: '100%',
                padding: '14px var(--space-md)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary-500)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-glass)')}
            />
          </div>

          {error && (
            <div
              style={{
                color: 'var(--danger-400)',
                fontSize: '0.85rem',
                marginBottom: 'var(--space-md)',
              }}
            >
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? '⏳ Loading...' : '🚀 Start VoiceTrace'}
          </button>
        </form>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            marginTop: 'var(--space-xl)',
          }}
        >
          WhatsApp par bhi use karein: apna voice message bhejein!
        </p>
      </div>
    </div>
  );
}
