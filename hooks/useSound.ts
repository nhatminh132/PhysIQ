'use client';

import { useCallback, useRef } from 'react';

interface CustomSounds {
  correct?: string;
  finish?: string;
}

export const useSound = (customSounds?: CustomSounds) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playCorrect = useCallback(() => {
    if (!customSounds) return;
    if (customSounds.correct) {
      if (!correctAudioRef.current) {
        correctAudioRef.current = new Audio(customSounds.correct);
      }
      correctAudioRef.current.currentTime = 0;
      correctAudioRef.current.play().catch(() => {});
    } else {
      playDefaultCorrect();
    }
  }, [customSounds]);

  const playDefaultCorrect = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getAudioContext]);

  const playWrong = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getAudioContext]);

  const playFinish = useCallback(() => {
    if (!customSounds) return;
    if (customSounds.finish) {
      if (!finishAudioRef.current) {
        finishAudioRef.current = new Audio(customSounds.finish);
      }
      finishAudioRef.current.currentTime = 0;
      finishAudioRef.current.play().catch(() => {});
    }
  }, [customSounds]);

  return { playCorrect, playWrong, playFinish, playDefaultCorrect };
};
