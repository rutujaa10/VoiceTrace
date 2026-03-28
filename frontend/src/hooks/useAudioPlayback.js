/**
 * useAudioPlayback — Audio Playback with Seek Hook
 *
 * Phase 4 Feature 8: Voice Playback with Highlights
 *
 * Allows users to tap any extracted item in the ledger and hear
 * the original audio fragment that produced it.
 *
 * Uses the word-level timestamps stored in the ledger entry
 * to seek to the exact audio position and play until the end timestamp.
 *
 * Usage:
 *   const { play, stop, isPlaying, currentItemId } = useAudioPlayback(audioUrl);
 *   <button onClick={() => play(item._id, item.audioTimestamp.startTime, item.audioTimestamp.endTime)}>
 *     Hear this
 *   </button>
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function useAudioPlayback(audioFilename) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const endTimeRef = useRef(null);
  const progressRef = useRef(null);

  // Build the audio URL from filename
  const audioUrl = audioFilename
    ? `${API_BASE.replace('/api', '')}/storage/${audioFilename}`
    : null;

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = audioUrl;
    audioRef.current = audio;

    audio.onerror = () => {
      setError('Failed to load audio file');
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.src = '';
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [audioUrl]);

  /**
   * Play the audio segment for a specific item.
   *
   * @param {string} itemId - unique ID of the item (for highlighting)
   * @param {number} startTime - start position in seconds
   * @param {number} endTime - end position in seconds
   */
  const play = useCallback((itemId, startTime, endTime) => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      setError('No audio available for this entry');
      return;
    }

    // If same item is playing, stop it
    if (isPlaying && currentItemId === itemId) {
      stop();
      return;
    }

    setError(null);
    setCurrentItemId(itemId);
    endTimeRef.current = endTime;

    // Seek to start position
    audio.currentTime = startTime || 0;
    audio.play()
      .then(() => {
        setIsPlaying(true);

        // Track progress and stop at endTime
        const checkProgress = () => {
          if (!audioRef.current) return;

          const current = audioRef.current.currentTime;
          const start = startTime || 0;
          const end = endTimeRef.current || audioRef.current.duration;
          const pct = Math.min(100, ((current - start) / (end - start)) * 100);
          setProgress(pct);

          if (current >= end) {
            stop();
            return;
          }

          if (isPlaying) {
            progressRef.current = requestAnimationFrame(checkProgress);
          }
        };

        progressRef.current = requestAnimationFrame(checkProgress);
      })
      .catch((err) => {
        console.error('[AudioPlayback] Play error:', err);
        setError('Tap again to play audio');
        setIsPlaying(false);
      });
  }, [audioUrl, isPlaying, currentItemId]);

  /**
   * Stop playback.
   */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }

    if (progressRef.current) {
      cancelAnimationFrame(progressRef.current);
    }

    setIsPlaying(false);
    setCurrentItemId(null);
    setProgress(0);
    endTimeRef.current = null;
  }, []);

  // Stop when audio ends naturally
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => stop();
    const handleTimeUpdate = () => {
      if (endTimeRef.current && audio.currentTime >= endTimeRef.current) {
        stop();
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [stop]);

  return {
    play,
    stop,
    isPlaying,
    currentItemId,
    progress,
    error,
    hasAudio: !!audioUrl,
  };
}
