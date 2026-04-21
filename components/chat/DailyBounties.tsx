'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  progress?: number;
  target?: number;
}

interface DailyBountiesProps {
  isCompactView?: boolean;
}

export function DailyBounties({ isCompactView = false }: DailyBountiesProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchQuests = () => {
      fetch('/api/quests')
        .then(r => r.json())
        .then(d => {
          if (mounted) {
            setQuests(d.quests || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setLoading(false);
        });
    };
    fetchQuests();
    
    window.addEventListener('quest-progress-update', fetchQuests);

    const handleOpen = () => {
      setPopoverOpen(true);
      setCollapsed(false);
    };
    window.addEventListener('open-daily-bounties', handleOpen);

    return () => {
      mounted = false;
      window.removeEventListener('quest-progress-update', fetchQuests);
      window.removeEventListener('open-daily-bounties', handleOpen);
    };
  }, []);

  const completedCount = quests.filter(q => q.completed).length;

  const content = (
    <div className="px-2 pb-2 space-y-1">
      {loading ? (
        <div className="py-3 flex justify-center">
          <div className="w-4 h-4 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'rgba(251,191,36,0.7)' }} />
        </div>
      ) : quests.length === 0 ? (
        <p className="text-[9px] text-[var(--foreground-subtle)] text-center py-2">No bounties today</p>
      ) : (
        quests.map(q => {
          const isBonus = q.title.startsWith('Bounty:');
          const displayTitle = q.title.replace(/^Bounty:\s*/i, '').replace(/^Daily:\s*/i, '').trim();

          const pct = q.target && q.target > 1
            ? Math.min(100, Math.round(((q.progress ?? 0) / q.target) * 100))
            : (q.completed ? 100 : 0);
          return (
            <div key={q.id}
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              className="flex flex-col gap-1 px-2 py-2 rounded-xl transition-opacity cursor-pointer select-none group hover:opacity-80"
              style={{
                background: q.completed ? 'rgba(34,197,94,0.06)' : 'transparent',
                border: q.completed ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-subtle)',
                opacity: q.completed ? 0.75 : 1,
              }}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{
                    background: q.completed ? 'rgba(251,191,36,0.2)' : 'var(--surface-active)',
                    border: `1px solid ${q.completed ? 'rgba(251,191,36,0.6)' : 'var(--border)'}`,
                  }}>
                  {q.completed && <Check className="w-2 h-2" style={{ color: '#fbbf24' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[var(--foreground)] leading-tight line-clamp-1 flex items-center gap-1.5">
                    {displayTitle}
                    {isBonus && (
                      <span className="px-1 py-0.5 text-[8px] font-black uppercase rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                        Bonus
                      </span>
                    )}
                  </p>
                  <p className={`text-[9px] text-[var(--foreground-subtle)] leading-snug mt-0.5 transition-all duration-200 ${expandedId === q.id ? '' : 'line-clamp-1'}`}>{q.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
                  <span className="text-[8px] font-black" style={{ color: 'rgba(251,191,36,0.8)' }}>+{q.xp}m</span>
                  <span className="text-[8px] font-black uppercase tracking-wider"
                    style={{ color: q.completed ? 'rgba(251,191,36,0.8)' : 'var(--foreground-muted)' }}>
                    {q.progress ?? 0}/{q.target ?? 1}
                  </span>
                </div>
              </div>
              {(q.target ?? 1) > 1 && (
                <div className="h-0.5 rounded-full overflow-hidden mx-0.5" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: q.completed ? '#22c55e' : 'rgba(251,191,36,0.75)',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  if (isCompactView) {
    return (
      <div className="relative">
        <button
          onClick={() => setPopoverOpen(!popoverOpen)}
          className="w-10 h-10 rounded-2xl flex flex-col justify-center items-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid rgba(251,191,36,0.4)', isolation: 'isolate' }}
        >
          <Target className="w-4 h-4 mb-0.5" style={{ color: 'rgba(251,191,36,1)' }} />
          <span className="text-[8px] font-black leading-none" style={{ color: 'rgba(251,191,36,1)' }}>
            {completedCount}/{quests.length}
          </span>
        </button>

        <AnimatePresence>
          {popoverOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[90]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setPopoverOpen(false)}
              />
              <motion.div
                 initial={{ opacity: 0, scale: 0.9, y: -10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: -10 }}
                 transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                 className="absolute top-12 right-0 w-[240px] md:w-[280px] rounded-2xl z-[91] shadow-2xl"
                 style={{
                    background: 'var(--sidebar-bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)',
                    backfaceVisibility: 'hidden' as const,
                    isolation: 'isolate'
                  }}
              >
                <div className="overflow-hidden rounded-2xl">
                  <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5" style={{ color: 'rgba(251,191,36,0.8)' }} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">Daily Bounties</span>
                    </div>
                    <span className="text-[9px] font-black" style={{ color: 'rgba(251,191,36,0.8)' }}>
                      {completedCount}/{quests.length}
                    </span>
                  </div>
                  <div className="pt-2 max-h-[300px] overflow-y-auto no-scrollbar">
                    {content}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setCollapsed(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-opacity hover:opacity-80"
      >
        <Target className="w-3 h-3 shrink-0" style={{ color: 'rgba(251,191,36,0.7)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
            Daily Bounties
          </p>
        </div>
        <span className="text-[9px] font-black shrink-0" style={{ color: 'rgba(251,191,36,0.8)' }}>
          {completedCount}/{quests.length}
        </span>
        {collapsed
          ? <ChevronRight className="w-3 h-3 shrink-0 text-[var(--foreground-subtle)]" />
          : <ChevronDown className="w-3 h-3 shrink-0 text-[var(--foreground-subtle)]" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
