'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HPBarProps {
  hp: number;
  maxHP?: number;
  hpDelta?: number | null;
}

export function HPBar({ hp, maxHP = 100, hpDelta }: HPBarProps) {
  const [deltas, setDeltas] = useState<{ id: number; val: number }[]>([]);

  useEffect(() => {
    if (hpDelta != null && hpDelta !== 0) {
      const newId = Date.now() + Math.random();
      setDeltas(prev => [...prev, { id: newId, val: hpDelta }]);
      const timer = setTimeout(() => {
        setDeltas(prev => prev.filter(d => d.id !== newId));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [hpDelta]);

  const safeHP = Math.max(0, hp);
  const pct = Math.min(100, (safeHP / maxHP) * 100);
  const isCritical = pct <= 20;
  const isLow = pct <= 50;

  const barColor = isCritical
    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
    : isLow
    ? 'linear-gradient(90deg, #f97316, #ef4444)'
    : 'linear-gradient(90deg, #22c55e, #16a34a)';

  const glowColor = isCritical
    ? 'rgba(239,68,68,0.6)'
    : isLow
    ? 'rgba(249,115,22,0.5)'
    : 'rgba(34,197,94,0.4)';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Heart
        className="w-3 h-3 shrink-0"
        style={{
          color: isCritical ? '#ef4444' : isLow ? '#f97316' : '#22c55e',
          fill: 'currentColor',
          filter: `drop-shadow(0 0 4px ${glowColor})`,
        }}
      />
      <div className="relative flex-1 h-1.5 rounded-full overflow-hidden min-w-[60px]"
        style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-subtle)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: barColor, boxShadow: `0 0 8px ${glowColor}` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {isCritical && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(239,68,68,0.25)' }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <span
        className="text-[9px] font-black shrink-0 tabular-nums"
        style={{
          color: isCritical ? '#ef4444' : isLow ? '#f97316' : 'var(--foreground-muted)',
          textShadow: isCritical ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
        }}
      >
        {safeHP}
      </span>

      <AnimatePresence>
        {deltas.map((d, i) => (
          <motion.span
            key={`hp-delta-${d.id}`}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -18 - (i * 12) }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute text-[9px] font-black pointer-events-none"
            style={{
              color: d.val > 0 ? '#22c55e' : '#ef4444',
              textShadow: `0 0 6px ${d.val > 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)'}`,
              right: 0,
              top: '-4px',
            }}
          >
            {d.val > 0 ? `+${d.val}` : d.val} HP
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
