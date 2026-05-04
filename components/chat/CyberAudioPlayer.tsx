'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, VolumeX } from 'lucide-react';

type State = 'idle' | 'loading' | 'playing' | 'unavailable';

// Module-level cache of object URLs keyed by `message|||voiceId`.
// We NEVER revoke these during the session — revocation corrupts replay.
// Browsers free object URLs on page unload automatically.
const audioUrlCache = new Map<string, string>();

const BAR_COUNT = 4;
const BAR_DELAYS = [0, 0.15, 0.3, 0.1];
const BAR_HEIGHTS = [
  { min: 4, max: 14 },
  { min: 6, max: 18 },
  { min: 3, max: 12 },
  { min: 5, max: 16 },
];

export function CyberAudioPlayer({ message, voiceId }: { message: string; voiceId?: string | null }) {
  const [state, setState] = useState<State>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleClick = useCallback(async () => {
    if (state === 'playing') {
      window.speechSynthesis.cancel();
      setState('idle');
      return;
    }
    if (state === 'unavailable') return;

    if (!('speechSynthesis' in window)) {
      setState('unavailable');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US'; // English by default

    utterance.onstart = () => setState('playing');
    utterance.onend = () => setState('idle');
    utterance.onerror = (e) => {
      console.warn('[TTS] playback error', e);
      setState('idle');
    };

    window.speechSynthesis.speak(utterance);
  }, [state, message]);

  // Service unavailable — render a muted, non-interactive icon
  if (state === 'unavailable') {
    return (
      <span
        className="relative flex items-center justify-center w-6 h-6 rounded-lg opacity-30 cursor-default"
        title="Voice unavailable"
        style={{ color: 'var(--foreground-subtle)' }}
      >
        <VolumeX className="w-3 h-3" />
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-200 hover:bg-white/8"
      style={{ color: state !== 'idle' ? 'rgb(34,211,238)' : 'var(--foreground-subtle)' }}
      title={state === 'playing' ? 'Stop' : 'Listen'}
    >
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.span
            key="play"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            <Play className="w-3 h-3 fill-current" />
          </motion.span>
        )}

        {state === 'loading' && (
          <motion.span
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-3.5 h-3.5 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: 'rgb(34,211,238)',
              animation: 'spin 0.7s linear infinite',
              boxShadow: '0 0 6px rgba(34,211,238,0.5)',
            }}
          />
        )}

        {state === 'playing' && (
          <motion.span
            key="bars"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-end gap-px"
            style={{ height: '14px' }}
          >
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <motion.span
                key={i}
                className="block rounded-sm"
                style={{
                  width: '2.5px',
                  background: 'rgb(34,211,238)',
                  boxShadow: '0 0 4px rgba(34,211,238,0.8)',
                  minHeight: `${BAR_HEIGHTS[i].min}px`,
                }}
                animate={{
                  height: [
                    `${BAR_HEIGHTS[i].min}px`,
                    `${BAR_HEIGHTS[i].max}px`,
                    `${BAR_HEIGHTS[i].min + 2}px`,
                    `${BAR_HEIGHTS[i].max - 2}px`,
                    `${BAR_HEIGHTS[i].min}px`,
                  ],
                }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: BAR_DELAYS[i],
                }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
