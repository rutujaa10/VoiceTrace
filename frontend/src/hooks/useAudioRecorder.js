/**
 * VoiceTrace — Audio Recording Hook
 *
 * Uses MediaRecorder API for in-browser audio recording.
 * Supports Chrome (webm/opus), Safari/iOS (mp4/aac), and Firefox.
 * Returns { isRecording, seconds, startRecording, stopRecording, audioBlob }
 */

import { useState, useRef, useCallback } from 'react';

/**
 * Detect the best supported audio MIME type for MediaRecorder.
 * Safari/iOS: audio/mp4 or audio/aac
 * Chrome/Edge: audio/webm;codecs=opus
 * Firefox: audio/ogg;codecs=opus or audio/webm
 */
function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ''; // Let the browser pick default
}

export function useAudioRecorder(maxDurationSeconds = 180) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setSeconds(0);
      chunksRef.current = [];

      // Check for secure context (HTTPS required on mobile for getUserMedia)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setError('Microphone requires HTTPS. Please use a secure connection or localhost.');
        return;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone not available in this browser. Try Chrome or Safari.');
        return;
      }

      // Audio constraints — don't set sampleRate (Safari rejects it)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Detect best supported MIME type (Safari needs mp4, Chrome uses webm)
      const mimeType = getSupportedMimeType();
      const recorderOptions = mimeType ? { mimeType } : {};

      const recorder = new MediaRecorder(stream, recorderOptions);
      const actualMime = recorder.mimeType || mimeType || 'audio/webm';
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMime });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.onerror = (e) => {
        console.error('[MediaRecorder] Error:', e);
        setError('Recording failed. Please try again.');
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(1000); // collect data every 1 second
      setIsRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      // Provide specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Microphone is already in use by another app.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Microphone constraints not supported. Trying default...');
        // Retry with basic constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          fallbackStream.getTracks().forEach((track) => track.stop());
        } catch {
          setError('Could not access microphone. Please try a different browser.');
        }
      } else {
        setError(`Microphone error: ${err.message || 'Unknown error'}`);
      }
      console.error('[Recorder]', err.name, err.message);
    }
  }, [maxDurationSeconds]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setSeconds(0);
    setError(null);
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    seconds,
    formattedTime: formatTime(seconds),
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
