'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { UserStats } from '../types';
import { getLevelInfo } from '../game/levels';

interface StatsContextType {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateDepth: (newDepth: number) => void;
  updateHP: (newHP: number) => void;
  leveledUp: { newLevel: number; newDepth: number } | null;
  clearLevelUp: () => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider = ({ children }: { children: ReactNode }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leveledUp, setLeveledUp] = useState<{ newLevel: number; newDepth: number } | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  const fetchedOnce = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/user/stats');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
        const info = getLevelInfo(data.stats.diveDepth ?? 0);
        prevLevelRef.current = info.level;
      } else {
        setError('No stats data available');
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
      setError('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      fetchStats();
    }
  }, [fetchStats]);

  const updateDepth = useCallback((newDepth: number) => {
    setStats(prev => {
      if (!prev) return prev;
      const oldDepth = prev.diveDepth ?? 0;
      const oldInfo = getLevelInfo(oldDepth);
      const newInfo = getLevelInfo(newDepth);

      if (newInfo.level > oldInfo.level && prevLevelRef.current !== null) {
        setLeveledUp({ newLevel: newInfo.level, newDepth });
      }
      prevLevelRef.current = newInfo.level;

      return {
        ...prev,
        diveDepth: newDepth,
        maxDiveDepth: Math.max(prev.maxDiveDepth ?? 0, newDepth),
      };
    });
  }, []);

  const updateHP = useCallback((newHP: number) => {
    setStats(prev => {
      if (!prev) return prev;
      return { ...prev, currentHP: Math.max(0, newHP) };
    });
  }, []);

  const clearLevelUp = useCallback(() => setLeveledUp(null), []);

  return (
    <StatsContext.Provider value={{ stats, loading, error, refetch: fetchStats, updateDepth, updateHP, leveledUp, clearLevelUp }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within StatsProvider');
  }
  return context;
};
