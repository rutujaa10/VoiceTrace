/**
 * i18n Configuration — VoiceTrace Multi-Language Support
 *
 * Supported: English, Hindi, Marathi, Gujarati, Kannada, Tamil, Telugu
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';
import mr from './locales/mr/translation.json';
import gu from './locales/gu/translation.json';
import kn from './locales/kn/translation.json';
import ta from './locales/ta/translation.json';
import te from './locales/te/translation.json';

i18n
  .use(LanguageDetector) // Auto-detect language from localStorage/browser
  .use(initReactI18next)  // Pass to react-i18next
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      gu: { translation: gu },
      kn: { translation: kn },
      ta: { translation: ta },
      te: { translation: te },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'mr', 'gu', 'kn', 'ta', 'te'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'voicetrace_language',
      caches: ['localStorage'],
    },

    react: {
      useSuspense: false, // Avoid Suspense complexity
    },
  });

// Update HTML lang attribute when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
