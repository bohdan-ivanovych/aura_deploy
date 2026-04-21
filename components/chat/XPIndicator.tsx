'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor } from 'lucide-react';
import { haptics } from '@/lib/utils/haptics';

interface DepthChange {
  delta: number;
}

interface DepthIndicatorProps {
  depthChange: DepthChange | null;
  isUser?: boolean;
}

export function XPIndicator({ depthChange, isUser = true }: DepthIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!depthChange) return;
    haptics.heavy();
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [depthChange]);

  if (!depthChange) return null;

  const isPositive = depthChange.delta > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -16 }}
          transition={{ type: 'spring', stiffness: 600, damping: 24 }}
          className={`absolute ${isUser ? 'right-0' : 'left-0'} bottom-full mb-1.5 pointer-events-none z-50`}
        >
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
            style={isPositive ? {
              background: 'rgba(0,212,212,0.18)',
              border: '1px solid rgba(0,212,212,0.28)',
              color: '#00d4d4',
            } : {
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
            }}
          >
            <Anchor className="w-2.5 h-2.5" />
            <span>{isPositive ? '+' : ''}{depthChange.delta}m</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
