/**
 * Login / Register View — Separate flows with clear UI
 *
 * Login: Enter phone → find existing account
 * Register: Enter phone + name + category → create new account
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';
import { vendorAPI } from '../api';

import { Mic, Key, Sparkles, Phone, AlertTriangle, CheckCircle, Apple, Leaf, Pizza, Coffee, Utensils, IceCream, Milk, Flower2, Store, Package, User } from 'lucide-react';

const CATEGORIES = [
  { value: 'fruits', label: 'Fruits', icon: <Apple size={24} /> },
  { value: 'vegetables', label: 'Vegetables', icon: <Leaf size={24} /> },
  { value: 'snacks', label: 'Snacks', icon: <Pizza size={24} /> },
  { value: 'beverages', label: 'Beverages', icon: <Coffee size={24} /> },
  { value: 'street_food', label: 'Street Food', icon: <Utensils size={24} /> },
  { value: 'sweets', label: 'Sweets', icon: <IceCream size={24} /> },
  { value: 'dairy', label: 'Dairy', icon: <Milk size={24} /> },
  { value: 'flowers', label: 'Flowers', icon: <Flower2 size={24} /> },
  { value: 'general', label: 'General', icon: <Store size={24} /> },
  { value: 'other', label: 'Other', icon: <Package size={24} /> },
];

export default function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await vendorAPI.login(phone);
      const vendor = res.data.data;

      dispatch({ type: actionTypes.SET_VENDOR, payload: vendor });
      dispatch({ type: actionTypes.SET_VENDOR_ID, payload: vendor._id });
      navigate('/app', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Login failed';

      if (status === 404) {
        setError('No account found with this number.');
        setSuccessMsg('');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const res = await vendorAPI.register({
        phone,
        name: name.trim(),
        businessCategory: category,
      });
      const vendor = res.data.data;

      dispatch({ type: actionTypes.SET_VENDOR, payload: vendor });
      dispatch({ type: actionTypes.SET_VENDOR_ID, payload: vendor._id });
      navigate('/app', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Registration failed';

      if (status === 409) {
        setError('');
        setSuccessMsg('Account already exists! Switching to login...');
        setTimeout(() => {
          setMode('login');
          setSuccessMsg('');
        }, 1500);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
  };

  const inputStyle = {
    width: '100%',
    padding: '14px var(--space-md)',
    background: 'var(--bg-glass)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
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
          maxWidth: 440,
          padding: 'var(--space-2xl)',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <Mic size={48} style={{ color: 'var(--primary-500)', margin: '0 auto', marginBottom: 'var(--space-sm)' }} />
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: 'var(--space-xs)',
          }}
        >
          <span className="gradient-text">VoiceTrace</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-xl)' }}>
          Apni awaaz se business sambhalein
        </p>

        {/* ═══ Login / Register Tab Switcher ═══ */}
        <div
          id="auth-tabs"
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 'var(--radius-lg)',
            padding: 4,
            border: '1px solid var(--border-subtle)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <button
            id="tab-login"
            onClick={() => switchMode('login')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: mode === 'login' ? 'var(--gradient-primary)' : 'transparent',
              color: mode === 'login' ? 'white' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: mode === 'login' ? 'var(--shadow-glow)' : 'none',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Key size={16} /> Login</span>
          </button>
          <button
            id="tab-register"
            onClick={() => switchMode('register')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: mode === 'register' ? 'var(--gradient-primary)' : 'transparent',
              color: mode === 'register' ? 'white' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: mode === 'register' ? 'var(--shadow-glow)' : 'none',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Sparkles size={16} /> Register</span>
          </button>
        </div>

        {/* ═══ LOGIN FORM ═══ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="animate-fadeIn">
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                htmlFor="login-phone"
                style={{
                  display: 'block',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Phone Number</span>
              </label>
              <input
                id="login-phone"
                type="tel"
                placeholder="Enter your registered phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={15}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-500)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-glass)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--danger-400)',
                  fontSize: '0.82rem',
                  marginBottom: 'var(--space-md)',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> {error}</span>
                {error.includes('No account') && (
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    style={{
                      display: 'block',
                      marginTop: 6,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-accent)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    → Create a new account
                  </button>
                )}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--success-400)',
                  fontSize: '0.82rem',
                  marginBottom: 'var(--space-md)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14} /> {successMsg}</span>
              </div>
            )}

            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Logging in...' : 'Login to My Account'}
            </button>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 'var(--space-lg)' }}>
              New here?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-accent)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Create an account →
              </button>
            </p>
          </form>
        )}

        {/* ═══ REGISTER FORM ═══ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="animate-fadeIn">
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label
                htmlFor="register-phone"
                style={{
                  display: 'block',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Phone Number *</span>
              </label>
              <input
                id="register-phone"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={15}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-500)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-glass)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label
                htmlFor="register-name"
                style={{
                  display: 'block',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Your Name *</span>
              </label>
              <input
                id="register-name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-500)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-glass)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                style={{
                  display: 'block',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 8,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Store size={14} /> Business Category</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 6,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    id={`cat-${cat.value}`}
                    style={{
                      padding: '8px 4px',
                      border: category === cat.value
                        ? '2px solid var(--primary-500)'
                        : '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      background: category === cat.value
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'var(--bg-glass)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <span style={{ display: 'inline-flex', color: category === cat.value ? 'var(--primary-500)' : 'var(--text-muted)' }}>{cat.icon}</span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      color: category === cat.value ? 'var(--text-accent)' : 'var(--text-muted)',
                    }}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--danger-400)',
                  fontSize: '0.82rem',
                  marginBottom: 'var(--space-md)',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> {error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--success-400)',
                  fontSize: '0.82rem',
                  marginBottom: 'var(--space-md)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14} /> {successMsg}</span>
              </div>
            )}

            <button
              id="register-btn"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Creating Account...' : 'Create My Account'}
            </button>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 'var(--space-lg)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-accent)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Login here →
              </button>
            </p>
          </form>
        )}

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.72rem',
            marginTop: 'var(--space-xl)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-md)',
          }}
        >
          WhatsApp par bhi use karein: apna voice message bhejein!
        </p>
      </div>
    </div>
  );
}
