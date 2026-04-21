import React from 'react';
import { motion } from 'framer-motion';
import { User, Share2, Settings } from 'lucide-react';
import Link from 'next/link';
import { SPRING_OPTIONS } from '@/lib/config';

interface Props {
  name: string;
  rankName: string;
  level: number;
  loading: boolean;
  onShare: () => void;
}

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

export function IdentityHeader({ name, rankName, level, loading, onShare }: Props) {
  const textPrimary = 'var(--foreground)';
  const textMuted = 'var(--foreground-muted)';

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0 }}
      className="flex items-center gap-3.5"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 gradient-avatar">
        <User className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-black truncate" style={{ color: textPrimary }}>
            {loading ? '—' : name}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--accent-amber, #fbbf24) 15%, transparent)',
              color: 'var(--accent-amber, #f59e0b)',
              border: '1px solid color-mix(in srgb, var(--accent-amber, #fbbf24) 25%, transparent)',
            }}>
            {rankName} · Lv {level}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          transition={SPRING}
          onClick={onShare}
          className="w-9 h-9 rounded-xl flex items-center justify-center liquid-glass"
        >
          <Share2 className="w-[15px] h-[15px]" style={{ color: textMuted }} />
        </motion.button>
        <Link href="/settings">
          <motion.div
            whileTap={{ scale: 0.88 }}
            whileHover={{ rotate: 30, scale: 1.05 }}
            transition={SPRING}
            className="w-9 h-9 rounded-xl flex items-center justify-center liquid-glass"
          >
            <Settings className="w-[15px] h-[15px]" style={{ color: textMuted }} />
          </motion.div>
        </Link>
      </div>
    </motion.section>
  );
}
