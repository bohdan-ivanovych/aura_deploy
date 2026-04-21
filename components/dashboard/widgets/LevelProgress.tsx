import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

interface Props {
  levelInfo: { level: number; progress: number; depthInLevel: number; isMax: boolean; nextDepth: number; minDepth: number };
  depth: number;
  loading: boolean;
}

export function LevelProgress({ levelInfo, depth, loading }: Props) {
  const { level, progress, depthInLevel } = levelInfo;
  const depthRequired = levelInfo.isMax ? 0 : levelInfo.nextDepth - levelInfo.minDepth;

  const trackBg = 'var(--surface-active)';

  return (
    <motion.section
      aria-label="Level progress"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.08 }}
      className="rounded-3xl p-5 space-y-4"
      style={{
        background: 'var(--surface-hover)',
        border: '1px solid var(--border)',
        backdropFilter: 'var(--glass-blur, blur(16px)) saturate(160%)',
        WebkitBackdropFilter: 'var(--glass-blur, blur(16px)) saturate(160%)',
        boxShadow: 'var(--card-shadow, 0 8px 24px rgba(0,0,0,0.35))',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--accent-cyan) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-cyan) 22%, transparent)',
              boxShadow: 'var(--glow-cyan, none)',
            }}>
            <TrendingUp className="w-4 h-4 text-[var(--accent-cyan)]" />
          </div>
          <div>
            <p className="text-[12px] font-black text-[var(--foreground)] uppercase tracking-wide">
              Level {level} Progress
            </p>
            <p className="text-[9px] text-[var(--foreground-subtle)] mt-0.5">
              {loading ? '—' : levelInfo.isMax ? 'Max Level Reached' : `${depthRequired - depthInLevel}m to Level ${level + 1}`}
            </p>
          </div>
        </div>
        <span className="text-lg font-black" style={{ color: 'var(--accent-cyan)', textShadow: 'var(--glow-cyan, none)' }}>
          {loading ? '—' : `${progress}%`}
        </span>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: loading ? '2%' : `${progress}%` }}
          transition={{ duration: 1.5, ease: 'circOut', delay: 0.25 }}
          className="h-full rounded-full relative"
          style={{
            background: 'linear-gradient(90deg, #00d4d4, #0098db)',
            boxShadow: '0 0 14px rgba(0,212,212,0.6)',
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]" />
        </motion.div>
      </div>

      <div className="flex justify-between">
        <span className="text-[9px] font-bold opacity-25">Lv {level}</span>
        <span className="text-[9px] font-bold opacity-25">Lv {level + 1}</span>
      </div>
    </motion.section>
  );
}
