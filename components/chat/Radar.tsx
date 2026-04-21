'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Flame, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import Link from 'next/link';

const DAILY_GOAL = 5; // messages to send per day
const STORAGE_KEY = 'aura_daily_goal';

interface GoalData {
  date: string; // YYYY-MM-DD
  count: number;
  celebrated: boolean;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export const Radar = memo(function Radar() {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [goal, setGoal] = useState<GoalData>({ date: getToday(), count: 0, celebrated: false });
  const [showCelebration, setShowCelebration] = useState(false);
  const [loadingQuests, setLoadingQuests] = useState(true);

  const fetchQuestState = useCallback(async () => {
    try {
      const res = await fetch('/api/quests');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.quests)) {
        const standardQuests = data.quests.slice(0, 5); // The 5 daily category quests
        const count = standardQuests.filter((q: any) => q.completed).length;
        setGoal(prev => {
          const next = { date: getToday(), count, celebrated: prev.celebrated };
          if (count >= DAILY_GOAL && !prev.celebrated) {
            setShowCelebration(true);
            next.celebrated = true;
            setTimeout(() => setShowCelebration(false), 3500);
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to fetch radar quests', err);
    } finally {
      setLoadingQuests(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestState();
    const handleUpdate = () => fetchQuestState();
    window.addEventListener('quests-updated', handleUpdate);
    return () => window.removeEventListener('quests-updated', handleUpdate);
  }, [fetchQuestState]);

  const count = Math.min(goal.count, DAILY_GOAL);
  const pct = Math.round((count / DAILY_GOAL) * 100);
  const isDone = count >= DAILY_GOAL;
  const accentColor = isDone ? '#22c55e' : (isDark ? '#00d4d4' : '#0891b2');

  return (
    <Link href="/stats#quests"
      className="rounded-2xl px-4 py-3 relative overflow-hidden block"
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${isDark
          ? isDone ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'
          : isDone ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.07)'
        }`,
        boxShadow: isDone && isDark ? '0 0 20px rgba(34,197,94,0.08)' : 'none',
        transition: 'border-color 0.5s, box-shadow 0.5s',
      }}
    >
      {/* celebration confetti overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  background: ['#00d4d4', '#a78bfa', '#f59e0b', '#22c55e', '#f87171'][i % 5],
                }}
                initial={{ y: '110%', opacity: 1 }}
                animate={{ y: '-20%', opacity: [1, 1, 0] }}
                transition={{ duration: 1.4 + Math.random() * 0.8, delay: Math.random() * 0.4 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}30`,
            }}>
            {isDone
              ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
              : <Target className="w-3.5 h-3.5" style={{ color: accentColor }} />
            }
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
            Quests Completed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 22 }}
              className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              ✓ Done!
            </motion.span>
          )}
          <span className="text-[11px] font-black tabular-nums" style={{ color: accentColor }}>
            {count}/{DAILY_GOAL}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden"
        style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'circOut' }}
          style={{
            background: isDone
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : `linear-gradient(90deg, ${accentColor}, ${isDark ? '#0098db' : '#0369a1'})`,
            boxShadow: `0 0 10px ${accentColor}60`,
          }}
        />
      </div>

      {/* Segment dots */}
      <div className="flex justify-between mt-1.5 px-px">
        {Array.from({ length: DAILY_GOAL }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full"
            animate={{ scale: i < count ? [1, 1.5, 1] : 1, opacity: i < count ? 1 : 0.25 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{ background: i < count ? accentColor : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)') }}
          />
        ))}
      </div>

      {/* Streak bonus hint */}
      {!isDone && count > 0 && (
        <p className="text-[8.5px] mt-1.5 font-medium"
          style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)' }}>
          <Flame className="w-2.5 h-2.5 inline mr-0.5" style={{ color: '#f97316' }} />
          {DAILY_GOAL - count} more to keep your streak
        </p>
      )}
    </Link>
  );
});
