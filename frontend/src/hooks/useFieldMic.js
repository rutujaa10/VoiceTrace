/**
 * useFieldMic — Web Speech API hook for field-level voice corrections.
 *
 * Usage:
 *   const { startListening, stopListening, isListening, transcript } = useFieldMic();
 *
 * When the user speaks, `transcript` updates with the recognized text.
 * For numeric fields, spoken words like "four hundred" are parsed to 400.
 */

import { useState, useRef, useCallback } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/**
 * Attempt to parse a spoken string into a number.
 * Handles: "four hundred", "500", "paanch sau", etc.
 */
const parseSpokenNumber = (text) => {
  if (!text) return null;
  const cleaned = text.trim().replace(/[₹,]/g, '');

  // Direct numeric value
  const directNum = parseFloat(cleaned);
  if (!isNaN(directNum)) return directNum;

  // English word-to-number map
  const wordMap = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lakh: 100000,
  };

  // Hindi number words
  const hindiMap = {
    sifar: 0, ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5,
    chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
    gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
    solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20,
    tees: 30, chaalees: 40, pachaas: 50, saath: 60, sattar: 70,
    assi: 80, nabbe: 90, sau: 100, hazaar: 1000,
  };

  const allWords = { ...wordMap, ...hindiMap };
  const words = cleaned.toLowerCase().split(/\s+/);

  let total = 0;
  let current = 0;

  for (const word of words) {
    const val = allWords[word];
    if (val === undefined) {
      // Try parsing as a number fragment
      const numFrag = parseFloat(word);
      if (!isNaN(numFrag)) {
        current += numFrag;
      }
      continue;
    }

    if (val === 100) {
      current = current === 0 ? 100 : current * 100;
    } else if (val === 1000 || val === 100000) {
      current = current === 0 ? val : current * val;
      total += current;
      current = 0;
    } else {
      current += val;
    }
  }

  total += current;
  return total > 0 ? total : null;
};

export function useFieldMic({ lang = 'hi-IN', isNumeric = false } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    setError('');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const raw = event.results[0][0].transcript;
      if (isNumeric) {
        const parsed = parseSpokenNumber(raw);
        setTranscript(parsed !== null ? String(parsed) : raw);
      } else {
        setTranscript(raw);
      }
    };

    recognition.onerror = (event) => {
      console.error('[FieldMic] Error:', event.error);
      if (event.error !== 'aborted') {
        setError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [lang, isNumeric]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    error,
    isSupported,
  };
}
