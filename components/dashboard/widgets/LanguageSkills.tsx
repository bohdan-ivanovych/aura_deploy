import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

interface Props {
  stats: any;
  isDark: boolean;
}

export function LanguageSkills({ stats, isDark }: Props) {
  const cardBg = 'var(--surface)';
  const cardBorder = 'var(--border)';
  const cardShadow = 'var(--card-shadow, 0 4px 32px rgba(0,0,0,0.4))';
  const textMuted = 'var(--foreground-muted)';
  const textSubtle = 'var(--foreground-subtle)';
  const divider = 'var(--border-subtle, var(--border))';
  const trackBg = 'var(--surface-active)';

  return (
    <motion.section
      aria-label="Language skills"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.09 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: isDark ? 'blur(24px)' : 'none' }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${divider}` }}>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} />
          <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: textSubtle }}>
            Language Skills
          </h2>
        </div>
      </div>
      {(stats?.avgVocabulary || stats?.avgComplexity || stats?.avgFluency) ? (
        <div className="px-5 py-4 flex flex-col gap-3">
          {[
            { label: 'Vocabulary', value: stats?.avgVocabulary ?? 50, color: '#f59e0b' },
            { label: 'Complexity', value: stats?.avgComplexity ?? 50, color: '#00d4d4' },
            { label: 'Fluency', value: stats?.avgFluency ?? 50, color: '#a78bfa' },
            { label: 'Grammar', value: stats?.avgGrammar ?? 50, color: '#f43f5e' },
            { label: 'Accuracy', value: stats?.avgAccuracy ?? 50, color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: textMuted }}>{label}</span>
                <span className="text-xs font-black" style={{ color }}>{value}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 1, ease: 'circOut', delay: 0.3 }}
                  style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
                />
              </div>
            </div>
          ))}

          {/* Strengths & Gaps */}
          {((stats?.topWeaknesses?.length ?? 0) > 0 || (stats?.topStrengths?.length ?? 0) > 0) && (
            <div className="flex gap-3 pt-3 mt-1" style={{ borderTop: `1px solid ${divider}` }}>
              {(stats?.topWeaknesses?.length ?? 0) > 0 && (
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: 'rgba(248,113,113,0.7)' }}>Gaps</p>
                  <div className="space-y-1">
                    {stats!.topWeaknesses!.slice(0, 2).map((w: any) => (
                      <span key={w.rule} className="text-[12px] font-medium capitalize block" style={{ color: 'rgba(252,165,165,0.85)' }}>{w.rule}</span>
                    ))}
                  </div>
                </div>
              )}
              {(stats?.topStrengths?.length ?? 0) > 0 && (
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: 'rgba(52,211,153,0.7)' }}>Strengths</p>
                  <div className="space-y-1">
                    {stats!.topStrengths!.slice(0, 2).map((s: any) => (
                      <span key={s.rule} className="text-[12px] font-medium capitalize block" style={{ color: 'rgba(110,231,183,0.85)' }}>{s.rule}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {[
            { label: 'Vocabulary', color: '#f59e0b' },
            { label: 'Complexity', color: '#00d4d4' },
            { label: 'Fluency', color: '#a78bfa' },
            { label: 'Grammar', color: '#f43f5e' },
            { label: 'Accuracy', color: '#3b82f6' },
          ].map(({ label, color }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: textMuted }}>{label}</span>
                <span className="text-xs font-black" style={{ color: textSubtle }}>?</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: trackBg }}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px" style={{ background: `repeating-linear-gradient(90deg, ${color}40 0, ${color}40 4px, transparent 4px, transparent 10px)` }} />
                </div>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-center pt-1" style={{ color: textSubtle }}>
            Start chatting to measure your skills
          </p>
        </div>
      )}
    </motion.section>
  );
}
