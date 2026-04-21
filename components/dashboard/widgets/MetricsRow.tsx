import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Anchor, Trophy } from 'lucide-react';
import { CountUp } from '@/components/ui/CountUp';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

const MetricPill = memo(({ label, value, unit, icon: Icon, color, loading, isDark }: {
  label: string; value: number; unit?: string; icon: React.ComponentType<any>;
  color: string; glow: string; loading: boolean; isDark: boolean;
}) => (
  <motion.div
    whileTap={{ scale: 0.94 }}
    whileHover={{ y: -2, scale: 1.02 }}
    transition={SPRING}
    className="w-full flex flex-col items-center gap-2 py-5 px-2 rounded-3xl relative overflow-hidden liquid-glass"
  >
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${color}10 0%, transparent 65%)` }}
    />
    <div className="w-8 h-8 rounded-2xl flex items-center justify-center relative"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}28`,
        boxShadow: `0 0 16px ${color}22`,
      }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="text-2xl font-black tracking-tight leading-none relative" style={{ color }}>
      {loading
        ? <span className="inline-block w-10 h-6 rounded-lg animate-pulse" style={{ background: `${color}22` }} />
        : <><CountUp value={value} />{unit && <span className="text-sm ml-0.5 font-bold opacity-60">{unit}</span>}</>
      }
    </div>
    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 relative">{label}</p>
  </motion.div>
));
MetricPill.displayName = 'MetricPill';

interface Props {
  streak: number;
  depth: number;
  level: number;
  loading: boolean;
  isDark: boolean;
}

export function MetricsRow({ streak, depth, level, loading, isDark }: Props) {
  const streakColor = streak >= 30 ? '#ff6b35' : streak >= 7 ? '#fbbf24' : '#6b7280';
  
  return (
    <section aria-label="Learning statistics" className="flex gap-3">
      {[
        { label: 'Streak', value: streak, icon: Flame, color: streakColor, glow: `${streakColor}66`, delay: 0.06, unit: 'd' },
        { label: 'Depth', value: depth, icon: Anchor, color: '#00d4d4', glow: 'rgba(0,212,212,0.4)', delay: 0.10, unit: 'm' },
        { label: 'Level', value: level, icon: Trophy, color: '#a78bfa', glow: 'rgba(167,139,250,0.4)', delay: 0.14 },
      ].map(({ delay, ...pillProps }) => (
        <motion.div
          key={pillProps.label}
          className="flex-1"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay }}
        >
          <MetricPill {...pillProps} loading={loading} isDark={isDark} />
        </motion.div>
      ))}
    </section>
  );
}
