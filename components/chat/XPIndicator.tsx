'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, ArrowRight } from 'lucide-react';
import { haptics } from '@/lib/utils/haptics';

interface DepthChange {
  delta: number;
  /** Skill tree node slug — present when AI identified a grammar weakness */
  skillSlug?: string | null;
}

interface DepthIndicatorProps {
  depthChange: DepthChange | null;
  isUser?: boolean;
}

export function XPIndicator({ depthChange, isUser = true }: DepthIndicatorProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!depthChange) return;
    haptics.heavy();
    setVisible(true);
    // Give more time to read & tap when there's a skill to navigate to
    const duration = depthChange.skillSlug ? 5000 : 2200;
    timerRef.current = setTimeout(() => setVisible(false), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [depthChange]);

  if (!depthChange) return null;

  const isPositive = depthChange.delta > 0;
  const hasSkill = !!depthChange.skillSlug;

  const handleClick = () => {
    if (!hasSkill) return;
    haptics.light();
    setVisible(false);
    router.push(`/skill-tree?topic=${encodeURIComponent(depthChange.skillSlug!)}`);
  };

  const positiveStyle = {
    background: hasSkill ? 'rgba(0,212,212,0.22)' : 'rgba(0,212,212,0.18)',
    border: hasSkill ? '1px solid rgba(0,212,212,0.45)' : '1px solid rgba(0,212,212,0.28)',
    color: '#00d4d4',
    boxShadow: hasSkill ? '0 0 12px rgba(0,212,212,0.25)' : 'none',
  };
  const negativeStyle = {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.25)',
    color: '#ef4444',
    boxShadow: 'none',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -16 }}
          transition={{ type: 'spring', stiffness: 600, damping: 24 }}
          className={`absolute ${isUser ? 'right-0' : 'left-0'} bottom-full mb-1.5 z-50`}
          style={{ pointerEvents: hasSkill ? 'auto' : 'none' }}
        >
          <motion.div
            onClick={hasSkill ? handleClick : undefined}
            animate={hasSkill ? { boxShadow: ['0 0 0px rgba(0,212,212,0)', '0 0 14px rgba(0,212,212,0.35)', '0 0 0px rgba(0,212,212,0)'] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap transition-transform ${hasSkill ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
            style={isPositive ? positiveStyle : negativeStyle}
          >
            <Anchor className="w-2.5 h-2.5 shrink-0" />
            <span>{isPositive ? '+' : ''}{depthChange.delta}m</span>
            {hasSkill && (
              <span className="flex items-center gap-0.5 opacity-75 text-[9px]">
                <ArrowRight className="w-2.5 h-2.5" />
                <span>skill tree</span>
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
