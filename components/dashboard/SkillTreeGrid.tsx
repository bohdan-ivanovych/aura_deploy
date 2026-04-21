'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, TrendingUp } from 'lucide-react';
import { SPRING_OPTIONS } from '@/lib/config';
import { STAGGER } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { GRAMMAR_NODES } from '@/lib/game/grammar-nodes';

interface SkillNodeProps {
  title: string;
  slug: string;
  progress: number;
  level: number;
  unlocked: boolean;
  category: string;
}

const CATEGORY_COLORS: Record<string, { accent: string; bg: string; border: string; glow: string }> = {
  'Verb Tenses': { accent: 'var(--accent-cyan)', bg: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)', border: 'color-mix(in srgb, var(--accent-cyan) 25%, transparent)', glow: 'color-mix(in srgb, var(--accent-cyan) 40%, transparent)' },
  'Prepositions': { accent: 'var(--accent-fuchsia)', bg: 'color-mix(in srgb, var(--accent-fuchsia) 10%, transparent)', border: 'color-mix(in srgb, var(--accent-fuchsia) 25%, transparent)', glow: 'color-mix(in srgb, var(--accent-fuchsia) 40%, transparent)' },
  'Articles & Determiners': { accent: '#fbbf24', bg: 'color-mix(in srgb, #fbbf24 10%, transparent)', border: 'color-mix(in srgb, #fbbf24 25%, transparent)', glow: 'color-mix(in srgb, #fbbf24 40%, transparent)' },
  'Conditionals': { accent: '#60a5fa', bg: 'color-mix(in srgb, #60a5fa 10%, transparent)', border: 'color-mix(in srgb, #60a5fa 25%, transparent)', glow: 'color-mix(in srgb, #60a5fa 40%, transparent)' },
  'Sentence Structure': { accent: '#00e676', bg: 'color-mix(in srgb, #00e676 10%, transparent)', border: 'color-mix(in srgb, #00e676 25%, transparent)', glow: 'color-mix(in srgb, #00e676 40%, transparent)' },
};

const DEFAULT_COLOR = { accent: 'var(--foreground-subtle)', bg: 'var(--surface)', border: 'var(--border)', glow: 'transparent' };

const SkillNode = React.memo(({ title, progress, level, unlocked, category, slug }: SkillNodeProps) => {
  const router = useRouter();
  const colors = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;

  const handleNodeClick = useCallback(() => {
    if (unlocked) {
      router.push(`/skill-tree/${slug}`);
    } else {
      router.push('/skill-tree');
    }
  }, [router, unlocked, slug]);

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_OPTIONS}
      onClick={handleNodeClick}
      className={cn(
        'relative overflow-hidden rounded-xl p-3.5 flex flex-col justify-between gap-2 md:min-h-[100px] lg:min-h-[120px] transition-all cursor-pointer liquid-glass',
        !unlocked && 'opacity-60'
      )}
      style={{
        background: unlocked ? colors.bg : 'var(--surface)',
        border: `1px solid ${unlocked ? colors.border : 'var(--border)'}`,
        boxShadow: unlocked ? `0 4px 20px ${colors.glow}` : undefined,
      }}
    >
      {unlocked && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${progress}%` }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ background: `${colors.bg}`, opacity: 0.6 }}
        />
      )}

      <div className="relative flex items-center justify-between gap-1 mb-0.5">
        <span className="text-[7px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-md truncate max-w-[70%]"
          style={{
            color: unlocked ? colors.accent : 'var(--foreground-subtle)',
            background: unlocked ? `${colors.bg}` : 'var(--surface-hover)',
            border: `1px solid ${unlocked ? colors.border : 'var(--border)'}`,
          }}>
          {category}
        </span>
        <div className="shrink-0">
          {unlocked
            ? <Sparkles className="w-3 h-3" style={{ color: colors.accent }} />
            : <Lock className="w-3 h-3 text-[var(--foreground-subtle)]" />
          }
        </div>
      </div>

      <h3 className="relative text-[10px] font-black tracking-tight uppercase leading-tight"
        style={{ color: unlocked ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
        {title}
      </h3>

      <div className="relative space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold" style={{ color: 'var(--foreground-subtle)' }}>
            L{level}
          </span>
          <span className="text-[8px] font-bold" style={{ color: unlocked ? colors.accent : 'var(--foreground-subtle)' }}>
            {progress}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'circOut' }}
            className="h-full rounded-full"
            style={{ background: unlocked ? colors.accent : 'var(--border)', boxShadow: unlocked ? `0 0 4px ${colors.glow}` : undefined }}
          />
        </div>
      </div>
    </motion.div>
  );
});
SkillNode.displayName = 'SkillNode';

type UserStats = {
  xp: number;
  diveDepth: number;
  maxDiveDepth: number;
  name: string | null;
  grammarWeaknesses: Record<string, number> | null;
  unlockedNodes?: string[];
};

export function SkillTreeGrid({ stats, limit }: { stats: UserStats | null; limit?: number }) {
  const nodes = useMemo(() => {
    if (!stats) return GRAMMAR_NODES.map((def, i) => ({ ...def, progress: 0, unlocked: false, skeleton: true }));

    const weaknesses = stats?.grammarWeaknesses ?? {};
    const unlockedSlugs = new Set(stats?.unlockedNodes ?? []);
    const maxCount = Object.values(weaknesses).reduce((max, v) => (typeof v === 'number' && v > max ? v : max), 0);

    return GRAMMAR_NODES.map((def) => {
      const rawScore = def.keywords.reduce((sum, key) => {
        const value = weaknesses[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
      const normalized = maxCount > 0 ? Math.min(100, Math.round((rawScore / maxCount) * 100)) : 0;
      return { ...def, progress: normalized, unlocked: unlockedSlugs.has(def.slug) || normalized > 0 };
    });
  }, [stats]);

  const prefersReduced = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: {
      transition: prefersReduced
        ? { staggerChildren: 0, delayChildren: 0 }
        : { staggerChildren: 0.06, delayChildren: 0.05 },
    },
  };

  const itemVariants = prefersReduced
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : STAGGER.item;

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {GRAMMAR_NODES.slice(0, 12).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl skeleton-shimmer"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={`grid gap-4 ${limit && limit <= 4 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {nodes.slice(0, limit ?? nodes.length).map((node) => (
        <motion.div key={node.slug} variants={itemVariants}>
          <SkillNode {...node} />
        </motion.div>
      ))}
    </motion.div>
  );
}
