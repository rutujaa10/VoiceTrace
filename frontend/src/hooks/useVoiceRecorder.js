/**
 * useVoiceRecorder — Web Speech API Hook
 *
 * Uses the native SpeechRecognition API (Chrome/Edge/Android) for
 * real-time, in-browser speech-to-text — zero Whisper API cost.
 *
 * Features:
 *   - Supports Hindi (hi-IN) and English (en-IN)
 *   - Auto-restarts on speech gaps (continuous mode)
 *   - Returns real-time interim + final transcript
 *   - Timer tracking
 *   - Graceful fallback check (isSupported)
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export function useVoiceRecorder({
  lang = 'hi-IN',
  maxDurationSeconds = 180,
  autoRestart = true,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const transcriptRef = useRef('');

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimText('');
    setSeconds(0);
    transcriptRef.current = '';
    shouldRestartRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText) {
        transcriptRef.current += finalText;
        setTranscript(transcriptRef.current.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are normal during gaps — auto-restart handles these
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
        shouldRestartRef.current = false;
      } else if (event.error === 'network') {
        setError('Network error. Speech recognition requires an internet connection.');
        shouldRestartRef.current = false;
      } else {
        console.warn('[SpeechRecognition] Error:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart on speech gaps if still supposed to be listening
      if (shouldRestartRef.current && autoRestart) {
        try {
          recognition.start();
          return;
        } catch (e) {
          // Already started or other issue — ignore
        }
      }

      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError('Failed to start speech recognition.');
      return;
    }

    // Timer
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev + 1 >= maxDurationSeconds) {
          stopListening();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [lang, maxDurationSeconds, autoRestart]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }

    setIsListening(false);
    setInterimText('');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
    setSeconds(0);
    setError(null);
    transcriptRef.current = '';
  }, []);

  const changeLang = useCallback(
    (newLang) => {
      if (isListening) {
        stopListening();
        // Small delay then restart with new lang
        setTimeout(() => {
          startListening();
        }, 200);
      }
    },
    [isListening, stopListening, startListening]
  );

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* */ }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimText,
    fullText: transcript + (interimText ? ' ' + interimText : ''),
    seconds,
    formattedTime: formatTime(seconds),
    error,
    startListening,
    stopListening,
    resetTranscript,
    changeLang,
    hasTranscript: transcript.trim().length > 0,
  };
}
