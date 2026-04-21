'use client';

import { useEffect, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, RefreshCw, ChevronRight } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import { useRouter } from 'next/navigation';
import { mapWeaknessToNodeSlug } from '@/lib/game/grammar-nodes';
import Link from 'next/link';

interface WeaknessItem {
  rule: string;
  count: number;
  lastSeen: string;
}

interface WeaknessData {
  weaknesses: WeaknessItem[];
  strengths: WeaknessItem[];
}

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function urgencyColor(count: number, days: number): string {
  if (count >= 5 && days <= 3) return '#ef4444'; // hot — recent + frequent
  if (count >= 3 || days <= 7) return '#f97316';  // warm
  if (count >= 2) return '#eab308';               // lukewarm
  return '#22c55e';                               // stale — fading
}

export const WeaknessHeatmap = memo(function WeaknessHeatmap() {
  const { theme } = useTheme();
  const router = useRouter();

  const [data, setData] = useState<WeaknessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStrengths, setShowStrengths] = useState(false);

  useEffect(() => {
    fetch('/api/weaknesses')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData({ weaknesses: [], strengths: [] }))
      .finally(() => setLoading(false));
  }, []);

  const cardBg = 'var(--surface)';
  const cardBorder = 'var(--border)';
  const textMuted = 'var(--foreground-muted)';
  const textSubtle = 'var(--foreground-subtle)';
  const divider = 'var(--border-subtle, var(--border))';

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${divider}` }}>
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" style={{ color: '#e040fb' }} />
          <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: textSubtle }}>
            Grammar Heatmap
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStrengths(s => !s)}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] transition-opacity"
            style={{
              color: showStrengths ? '#22c55e' : textSubtle,
              opacity: showStrengths ? 1 : 0.5,
            }}
          >
            {showStrengths ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {showStrengths ? 'Strengths' : 'Weaknesses'}
          </button>
          <Link href="/chat">
            <motion.span
              whileHover={{ x: 2 }}
              transition={SPRING}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] opacity-35 hover:opacity-65 transition-opacity"
            >
              Practice <ChevronRight className="w-3 h-3" />
            </motion.span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 py-4 space-y-2"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl animate-pulse"
                style={{ background: 'var(--surface-hover)' }} />
            ))}
          </motion.div>
        ) : showStrengths ? (
          <motion.div
            key="strengths"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="px-5 py-4 space-y-2"
          >
            {(!data?.strengths || data.strengths.length === 0) ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <TrendingUp className="w-7 h-7 opacity-15" style={{ color: '#22c55e' }} />
                <p className="text-[11px] font-medium text-center" style={{ color: textMuted }}>
                  No mastered rules yet
                </p>
                <p className="text-[10px] text-center" style={{ color: textSubtle }}>
                  Keep chatting — you'll master patterns over time
                </p>
              </div>
            ) : (
              data.strengths.map((s, i) => (
                <motion.div
                  key={s.rule}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'color-mix(in srgb, #22c55e 6%, transparent)',
                    border: '1px solid color-mix(in srgb, #22c55e 15%, transparent)',
                  }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
                  <p className="flex-1 text-[12px] font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
                    {s.rule}
                  </p>
                  <span className="text-[9px] font-black" style={{ color: 'rgba(34,197,94,0.8)' }}>
                    {s.count}× ✓
                  </span>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="weaknesses"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
          >
            {(!data?.weaknesses || data.weaknesses.length === 0) ? (
              <div className="py-8 flex flex-col items-center gap-2 px-5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--accent-fuchsia) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-fuchsia) 18%, transparent)' }}>
                  <Brain className="w-5 h-5" style={{ color: '#e040fb' }} />
                </div>
                <p className="text-[12px] font-bold text-center" style={{ color: textMuted }}>
                  No data yet
                </p>
                <p className="text-[11px] text-center" style={{ color: textSubtle }}>
                  Start chatting — errors will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: divider }}>
                {data.weaknesses.map((w, i) => {
                  const days = daysSince(w.lastSeen);
                  const color = urgencyColor(w.count, days);
                  const maxCount = data.weaknesses[0]?.count || 1;
                  const pct = Math.round((w.count / maxCount) * 100);
                  const heat = Math.round((pct / 100) * 6); // 0–6 dots

                  return (
                    <motion.div
                      key={w.rule}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="relative flex items-center gap-4 px-5 py-3.5 overflow-hidden cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
                      onClick={() => {
                        const slug = mapWeaknessToNodeSlug(w.rule);
                        if (slug) router.push(`/skill-tree/${slug}`);
                        else router.push(`/skill-tree?topic=${encodeURIComponent(w.rule)}`);
                      }}
                    >
                      {/* intensity fill */}
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(90deg, ${color}09 ${pct}%, transparent ${pct}%)` }} />

                      {/* Rank */}
                      <span className="text-[11px] font-black w-4 text-center shrink-0 relative" style={{ color }}>
                        {i + 1}
                      </span>

                      {/* Rule name */}
                      <div className="flex-1 min-w-0 relative">
                        <p className="text-[13px] font-semibold capitalize truncate" style={{ color: 'var(--foreground)' }}>
                          {w.rule}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {/* heat dots */}
                          {Array.from({ length: 6 }).map((_, di) => (
                            <div
                              key={di}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: di < heat ? color : 'var(--surface-active)',
                                boxShadow: di < heat ? `0 0 4px ${color}80` : 'none',
                                transition: 'background 0.3s',
                              }}
                            />
                          ))}
                          <span className="text-[8.5px] ml-0.5" style={{ color: textSubtle }}>
                            {days === 0 ? 'today' : `${days}d ago`}
                          </span>
                        </div>
                      </div>

                      {/* Count */}
                      <div className="shrink-0 relative flex items-center gap-2">
                        <span className="text-[10px] font-black opacity-50">{w.count}×</span>
                        <RefreshCw className="w-3 h-3 opacity-30" style={{ color }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — tip */}
      {data?.weaknesses && data.weaknesses.length > 0 && !showStrengths && (
        <div className="px-5 pb-3 pt-1" style={{ borderTop: `1px solid ${divider}` }}>
          <p className="text-[9px] font-medium" style={{ color: textSubtle }}>
            🔴 = frequent & recent · 🟡 = improving · 🟢 = rarely seen
          </p>
        </div>
      )}
    </div>
  );
});
