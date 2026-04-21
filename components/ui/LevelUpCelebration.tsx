'use client';
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStats } from '@/lib/contexts/stats-context';

export function LevelUpCelebration() {
  const { leveledUp, clearLevelUp } = useStats();

  const fireConfetti = useCallback(async () => {
    const confetti = (await import('canvas-confetti')).default;
    const colors = ['#00d4d4', '#00ff88', '#00ffc8', '#a78bfa', '#e040fb', '#fbbf24', '#fff'];
    const end = Date.now() + 2800;

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.65 },
        colors,
        gravity: 0.85,
        scalar: 1.1,
        zIndex: 99999,
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.65 },
        colors,
        gravity: 0.85,
        scalar: 1.1,
        zIndex: 99999,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.45 },
      colors,
      startVelocity: 30,
      gravity: 0.7,
      scalar: 1.0,
      zIndex: 99999,
    });
  }, []);

  useEffect(() => {
    if (!leveledUp) return;
    fireConfetti();
    const t = setTimeout(clearLevelUp, 4500);
    return () => clearTimeout(t);
  }, [leveledUp, fireConfetti, clearLevelUp]);

  return (
    <AnimatePresence>
      {leveledUp && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 0.25 }}
          onClick={clearLevelUp}
        >
          <motion.div
            initial={{ scale: 0.4, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
            className="flex flex-col items-center gap-5 pointer-events-none"
          >
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[9px] font-black uppercase tracking-[0.55em]"
              style={{ color: 'rgba(0,212,212,0.75)' }}
            >
              Neural Link Enhanced
            </motion.p>

            <div className="relative select-none leading-none">
              <span
                className="text-[110px] font-black tabular-nums"
                style={{
                  color: '#00ffc8',
                  fontFamily: 'monospace',
                  textShadow: '0 0 50px rgba(0,255,200,0.9), 0 0 100px rgba(0,255,200,0.4)',
                }}
              >
                {leveledUp.newLevel}
              </span>

              <motion.span
                className="absolute inset-0 text-[110px] font-black tabular-nums"
                style={{ color: '#e040fb', fontFamily: 'monospace', mixBlendMode: 'screen' }}
                animate={{
                  x: [-3, 3, -1, 2, 0, -3, 3, 0],
                  opacity: [0, 0.9, 0, 0.7, 0, 0.85, 0, 0],
                  clipPath: [
                    'inset(0 0 60% 0)',
                    'inset(0 0 60% 0)',
                    'inset(40% 0 0 0)',
                    'inset(40% 0 0 0)',
                    'none',
                    'inset(20% 0 30% 0)',
                    'inset(20% 0 30% 0)',
                    'none',
                  ],
                }}
                transition={{ duration: 0.85, repeat: Infinity, repeatDelay: 1.2 }}
              >
                {leveledUp.newLevel}
              </motion.span>

              <motion.span
                className="absolute inset-0 text-[110px] font-black tabular-nums"
                style={{ color: '#00d4d4', fontFamily: 'monospace', mixBlendMode: 'screen' }}
                animate={{
                  x: [3, -3, 2, -1, 0, 3, -3, 0],
                  opacity: [0, 0.7, 0, 0.6, 0, 0.75, 0, 0],
                  clipPath: [
                    'inset(30% 0 0 0)',
                    'inset(30% 0 0 0)',
                    'inset(0 0 50% 0)',
                    'inset(0 0 50% 0)',
                    'none',
                    'inset(0 0 40% 0)',
                    'inset(0 0 40% 0)',
                    'none',
                  ],
                }}
                transition={{ duration: 0.85, repeat: Infinity, repeatDelay: 1.2, delay: 0.06 }}
              >
                {leveledUp.newLevel}
              </motion.span>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.8, 1] }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-sm font-black uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              Level Up
            </motion.p>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
              className="h-px w-48 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #00ffc8, transparent)' }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 1.8 }}
              className="text-[9px] font-medium tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Tap to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
