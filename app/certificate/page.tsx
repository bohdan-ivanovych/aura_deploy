'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Star, Award } from 'lucide-react';
import { useStats } from '@/lib/contexts/stats-context';
import { getLevelInfo } from '@/lib/game/levels';

export default function CertificatePage() {
  const { stats } = useStats();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const diveDepth = stats?.diveDepth ?? 0;
  const levelInfo = getLevelInfo(diveDepth);
  const isUnlocked = levelInfo.level >= 10 || diveDepth >= 100;

  const userName = stats?.name || 'Anonymous';

  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.2)',
              filter: 'blur(0px)',
            }}>
            <Lock className="w-10 h-10" style={{ color: 'rgba(251,191,36,0.5)' }} />
          </div>
          <div className="absolute inset-0 rounded-3xl" style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.1), transparent 70%)',
          }} />
        </motion.div>

        <div className="space-y-2 max-w-xs">
          <p className="text-[9px] font-black uppercase tracking-[0.4em]"
            style={{ color: 'rgba(251,191,36,0.6)' }}>Locked Milestone</p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Fluency Certificate
          </h1>
          <p className="text-sm text-white/40 leading-relaxed">
            Your personalized certificate unlocks at Level 10 or 100 Dive Depth. Keep training.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Star className="w-5 h-5 shrink-0" style={{ color: 'rgba(251,191,36,0.6)' }} />
            <div className="flex-1 text-left">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Level Progress</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'rgba(251,191,36,0.7)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (levelInfo.level / 10) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] font-black text-white/60 shrink-0">
                  Lv {levelInfo.level} / 10
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Award className="w-5 h-5 shrink-0" style={{ color: 'rgba(34,211,238,0.6)' }} />
            <div className="flex-1 text-left">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Dive Depth</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'rgba(34,211,238,0.7)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, diveDepth)}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                <span className="text-[10px] font-black text-white/60 shrink-0">
                  {diveDepth} / 100
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-md rounded-[40px] p-8 flex flex-col items-center gap-6 text-center relative overflow-hidden"
        style={{
          background: 'rgba(10,10,18,0.95)',
          border: '1px solid rgba(251,191,36,0.3)',
          boxShadow: '0 0 80px rgba(251,191,36,0.15), 0 40px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08), transparent 60%)' }} />

        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <Award className="w-10 h-10" style={{ color: '#fbbf24' }} />
          </div>
          <motion.div
            className="absolute -inset-3 rounded-[28px]"
            style={{ border: '1px solid rgba(251,191,36,0.2)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em]"
            style={{ color: 'rgba(251,191,36,0.7)' }}>Certificate of Fluency</p>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            {userName}
          </h1>
          <p className="text-sm text-white/40 mt-2 leading-relaxed">
            Has demonstrated advanced English communication through immersive AI-driven practice.
          </p>
        </div>

        <div className="w-full grid grid-cols-3 gap-3">
          {[
            { label: 'Level', value: `${levelInfo.level}` },
            { label: 'XP', value: `${stats?.xp ?? 0}` },
            { label: 'Depth', value: `${diveDepth}` },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[8px] text-white/30 font-black uppercase tracking-[0.2em]">{item.label}</p>
              <p className="text-lg font-black text-white mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="w-full pt-4 border-t border-white/8 flex items-center justify-between">
          <p className="text-[9px] text-white/25 font-bold uppercase tracking-[0.2em]">Aura — English Training</p>
          <p className="text-[9px] text-white/25 font-bold uppercase tracking-[0.2em]" suppressHydrationWarning>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
