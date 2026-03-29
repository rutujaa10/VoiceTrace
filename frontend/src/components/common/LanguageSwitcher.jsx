/**
 * LanguageSwitcher — Dropdown to toggle between 7 languages
 * Persists choice to localStorage via i18next-browser-languagedetector
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'hi', label: 'हिं', native: 'हिंदी' },
  { code: 'mr', label: 'मरा', native: 'मराठी' },
  { code: 'gu', label: 'ગુજ', native: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமி', native: 'தமிழ்' },
  { code: 'te', label: 'తెలు', native: 'తెలుగు' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost"
        id="language-switcher-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Globe size={16} />
        <span>{currentLang.label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '6px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            zIndex: 1000,
            minWidth: '160px',
            padding: '6px',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background:
                  i18n.language === lang.code
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'transparent',
                color:
                  i18n.language === lang.code
                    ? '#16a34a'
                    : '#1a1a2e',
                fontSize: '0.82rem',
                fontWeight: i18n.language === lang.code ? 700 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.target.style.background =
                  i18n.language === lang.code
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(0,0,0,0.05)')
              }
              onMouseLeave={(e) =>
                (e.target.style.background =
                  i18n.language === lang.code
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'transparent')
              }
            >
              <span>{lang.native}</span>
              {i18n.language === lang.code && (
                <span style={{ marginLeft: 'auto' }}><Check size={14} /></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
