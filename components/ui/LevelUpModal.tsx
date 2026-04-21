'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Anchor, X } from 'lucide-react';
import { getLevelInfo } from '@/lib/game/levels';

interface LevelUpModalProps {
  newLevel: number;
  newDepth: number;
  onClose: () => void;
}

function Particle({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * 360;
  const dist = 80 + Math.random() * 120;
  const dx = Math.cos((angle * Math.PI) / 180) * dist;
  const dy = Math.sin((angle * Math.PI) / 180) * dist;
  const colors = ['#00d4d4', '#e040fb', '#00e676', '#fbbf24', '#f97316', '#60a5fa'];
  const color = colors[index % colors.length];
  const size = 4 + Math.random() * 6;
  const delay = Math.random() * 0.3;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        translateX: '-50%',
        translateY: '-50%',
      }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
      animate={{ x: dx, y: dy, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
    />
  );
}

function RingPulse({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: -20,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        opacity: 0,
      }}
      animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.6] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

export function LevelUpModal({ newLevel, newDepth, onClose }: LevelUpModalProps) {
  const levelInfo = getLevelInfo(newDepth);
  const [phase, setPhase] = useState<'burst' | 'reveal' | 'done'>('burst');
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PARTICLES = 32;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 400);
    const t2 = setTimeout(() => setPhase('done'), 600);
    autoCloseRef.current = setTimeout(onClose, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="relative flex flex-col items-center gap-6 px-12 py-10 rounded-[40px] max-w-sm w-full mx-4"
          style={{
            background: 'linear-gradient(135deg, rgba(15,15,20,0.97) 0%, rgba(5,5,10,0.99) 100%)',
            border: `1px solid ${levelInfo.color}44`,
            boxShadow: `0 0 80px ${levelInfo.color}33, 0 30px 80px rgba(0,0,0,0.8)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>

          <div className="relative">
            {Array.from({ length: PARTICLES }).map((_, i) => (
              <Particle key={i} index={i} total={PARTICLES} />
            ))}

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.15 }}
              className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${levelInfo.color}88, ${levelInfo.color}22)`,
                border: `3px solid ${levelInfo.color}99`,
                boxShadow: `0 0 40px ${levelInfo.color}88, 0 0 80px ${levelInfo.color}44`,
              }}
            >
              <RingPulse color={levelInfo.color} />
              <div className="flex flex-col items-center">
                <span className="text-4xl leading-none">{levelInfo.emoji}</span>
                <span className="text-white font-black text-xs uppercase tracking-widest mt-1">
                  Lv {newLevel}
                </span>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {phase !== 'burst' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: levelInfo.color }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]"
                    style={{ color: levelInfo.color }}>
                    Level Up!
                  </span>
                  <Sparkles className="w-4 h-4" style={{ color: levelInfo.color }} />
                </div>

                <h2 className="text-3xl font-black text-white tracking-tight">
                  {levelInfo.rank}
                </h2>
                <p className="text-sm text-white/50 max-w-[200px] leading-relaxed">
                  {levelInfo.description}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(0,212,212,0.15)', border: '1px solid rgba(0,212,212,0.3)' }}>
                    <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-black text-cyan-400">{newDepth}m depth</span>
                  </div>
                </div>

                {!levelInfo.isMax && (
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">
                    Next rank at {levelInfo.nextDepth}m
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            className="absolute bottom-0 left-0 right-0 h-1 rounded-b-[40px]"
            style={{ background: `linear-gradient(90deg, transparent, ${levelInfo.color}, transparent)` }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
