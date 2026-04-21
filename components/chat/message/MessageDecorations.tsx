import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ErrorHighlightedText({
  text,
  errorSpan,
  onReadTimeout,
}: {
  text: string;
  errorSpan: { original: string; corrected: string };
  onReadTimeout?: () => void;
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!tooltipVisible) return;
    const timer = setTimeout(() => {
      onReadTimeout?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [tooltipVisible, onReadTimeout]);

  const idx = text.indexOf(errorSpan.original);
  if (idx === -1) {
    return (
      <p className="text-[14px] leading-[1.65] font-medium text-[var(--foreground)] tracking-[0.005em] after:content-[''] after:inline-block after:w-[46px] after:h-2">
        {text}
      </p>
    );
  }

  const before = text.slice(0, idx);
  const wrong = text.slice(idx, idx + errorSpan.original.length);
  const after = text.slice(idx + errorSpan.original.length);

  return (
    <p className="text-[14px] leading-[1.65] font-medium text-[var(--foreground)] tracking-[0.005em] after:content-[''] after:inline-block after:w-[46px] after:h-2">
      {before}
      <span className="relative inline-block">
        <span
          ref={spanRef}
          onClick={() => setTooltipVisible(v => !v)}
          className="decoration-rose-500/80 underline decoration-wavy underline-offset-4 transition-all cursor-pointer rounded-sm hover:bg-rose-500/20 hover:text-rose-300"
        >
          {wrong}
        </span>
        <AnimatePresence>
          {tooltipVisible && (
            <motion.span
              initial={{ opacity: 0, y: 4, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.92 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none"
            >
              <span
                className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(248,113,113,0.4)',
                  boxShadow: '0 8px 32px rgba(248,113,113,0.2), 0 0 0 1px rgba(248,113,113,0.05)',
                  color: 'var(--foreground)',
                }}
              >
                <span style={{ color: 'rgba(248,113,113,0.9)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800 }}>
                  correction
                </span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{errorSpan.corrected}</span>
              </span>
              <span
                className="block mx-auto w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid rgba(248,113,113,0.35)',
                }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {after}
    </p>
  );
}

export function FloatingXPBadge({ value, color }: { value: number; color: 'green' | 'red' }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.6 }}
        animate={{ opacity: [0, 1, 1, 0], y: -56, scale: [0.6, 1.15, 1.05, 0.9] }}
        transition={{ duration: 1.9, ease: 'easeOut', times: [0, 0.12, 0.65, 1] }}
        className="absolute pointer-events-none select-none z-50 font-black italic"
        style={{
          top: '-4px',
          right: color === 'green' ? '-4px' : '12px',
          fontSize: '14px',
          letterSpacing: '-0.03em',
          color: color === 'green' ? '#4ade80' : '#f87171',
          textShadow: color === 'green'
            ? '0 0 8px rgba(74,222,128,0.9), 0 0 20px rgba(74,222,128,0.5), 0 0 40px rgba(74,222,128,0.25)'
            : '0 0 8px rgba(248,113,113,0.9), 0 0 20px rgba(248,113,113,0.5), 0 0 40px rgba(248,113,113,0.25)',
        }}
      >
        {value > 0 ? `+${value}` : value} XP
      </motion.div>
    </AnimatePresence>
  );
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--foreground-muted)' }}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export function ReadReceipt({ state }: { state: 'sent' | 'received' | 'read' }) {
  if (state === 'sent') {
    return <span className="text-[9px] text-[var(--foreground-subtle)]">✓</span>;
  }
  if (state === 'received') {
    return <span className="text-[9px] text-[var(--foreground-subtle)]">✓✓</span>;
  }
  return <span className="text-[9px]" style={{ color: '#2D9CDB' }}>✓✓</span>;
}

export function BubbleTail({ isAI }: { isAI: boolean }) {
  return (
    <div
      className="absolute bottom-0 w-2 h-1.5"
      style={{
        [isAI ? 'left' : 'right']: '-6px',
        background: isAI ? 'var(--bubble-ai-bg)' : 'var(--bubble-user-bg)',
        clipPath: isAI
          ? 'polygon(100% 0, 0% 100%, 100% 100%)'
          : 'polygon(0 0, 100% 100%, 0 100%)',
      }}
    />
  );
}
