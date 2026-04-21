'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface ReEntryScreenProps {
  daysSinceLastSession: number;
  depthLost: number;
  currentDepth: number;
  friendName?: string | null;
  friendDepth?: number | null;
}

function AnimatedDepth({ from, to }: { from: number; to: number }) {
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    if (from === to) return;
    const start = performance.now();
    const duration = 1500;
    const raf = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from - (from - to) * eased));
      if (t < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [from, to]);

  return (
    <span
      className="text-7xl font-black tabular-nums"
      style={{
        color: '#00d4d4',
        textShadow: '0 0 40px rgba(0,212,212,0.6)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {display}m
    </span>
  );
}

export function ReEntryScreen({ daysSinceLastSession, depthLost, currentDepth, friendName, friendDepth }: ReEntryScreenProps) {
  const router = useRouter();
  const preDepth = currentDepth + depthLost;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between px-8"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,50,80,0.6) 0%, #000812 70%)',
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center w-full max-w-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
          className="flex flex-col items-center gap-2"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: 'rgba(0,212,212,0.5)' }}>
            Current Depth
          </p>
          <AnimatedDepth from={preDepth} to={currentDepth} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-2xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {daysSinceLastSession} {daysSinceLastSession === 1 ? 'day' : 'days'} without a dive
          </p>

          {depthLost > 0 && (
            <p className="text-lg font-black font-mono" style={{ color: '#ef4444' }}>
              You&apos;ve surfaced {depthLost}m
            </p>
          )}

          {friendName && friendDepth != null && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              @{friendName} is now at {friendDepth}m
            </motion.p>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-sm pb-12"
      >
        <button
          onClick={() => router.push('/chat')}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] touch-manipulation"
          style={{
            background: 'linear-gradient(135deg, #00d4d4 0%, #0098db 100%)',
            color: '#000',
            boxShadow: '0 0 40px rgba(0,212,212,0.35)',
          }}
        >
          Dive Now →
        </button>
      </motion.div>
    </motion.div>
  );
}
