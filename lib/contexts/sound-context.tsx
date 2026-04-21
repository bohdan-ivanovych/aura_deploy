'use client';

import { createContext, useContext, useRef, useCallback, ReactNode, useEffect } from 'react';

interface SoundContextType {
  playTick: () => void;
  playSuccess: () => void;
  playError: () => void;
  playTherapyRoast: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

function useAudioContext() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return getCtx;
}

function beep(
  ctx: AudioContext,
  frequency: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  volume = 0.1
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    // Silence
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const getCtx = useAudioContext();

  const playTick = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    beep(ctx, 800, 30, 'sine', 0.05);
  }, [getCtx]);

  const playSuccess = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    beep(ctx, 523, 100, 'sine', 0.1);
    setTimeout(() => beep(ctx, 659, 100, 'sine', 0.1), 100);
    setTimeout(() => beep(ctx, 784, 150, 'sine', 0.1), 200);
  }, [getCtx]);

  const playError = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    beep(ctx, 150, 200, 'sawtooth', 0.08);
    setTimeout(() => beep(ctx, 100, 300, 'sawtooth', 0.06), 150);
  }, [getCtx]);

  const playTherapyRoast = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    // Darker, glitchier sound for therapy
    beep(ctx, 220, 150, 'square', 0.05);
    setTimeout(() => beep(ctx, 110, 400, 'square', 0.03), 100);
  }, [getCtx]);

  return (
    <SoundContext.Provider value={{ playTick, playSuccess, playError, playTherapyRoast }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within SoundProvider');
  return context;
};
