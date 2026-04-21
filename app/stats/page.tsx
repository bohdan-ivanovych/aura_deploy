'use client';

import { useStats } from '@/lib/contexts/stats-context';
import { useTheme } from '@/lib/contexts/theme-context';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, Flame, Target, MessageSquare, CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import { getLevelInfo } from '@/lib/game/levels';
import { buildNodes, TopicNode } from '@/lib/stats-helpers';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { LanguageSkills } from '@/components/dashboard/widgets/LanguageSkills';

const SkillRadarHUD = dynamic(
  () => import('@/components/stats/SkillRadarHUD').then(m => ({ default: m.SkillRadarHUD })),
  { ssr: false }
);
const BubblePhysicsLayer = dynamic(
  () => import('@/components/stats/BubblePhysicsLayer').then(m => ({ default: m.BubblePhysicsLayer })),
  { ssr: false }
);
import type { RadarSkill } from '@/components/stats/SkillRadarHUD';
import { IcebergIllustration, AbyssBackground } from '@/components/stats/IcebergIllustration';

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';

export default function StatsPage() {
  const { stats, loading, error, refetch } = useStats();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const depth = stats?.diveDepth ?? 0;
  const isAbyss = depth >= 15;

  const [isMobile, setIsMobile] = useState(false);
  const [seedNodes, setSeedNodes] = useState<TopicNode[]>([]);

  const radarRef = useRef<HTMLDivElement>(null);
  const statsHudRef = useRef<HTMLDivElement>(null);
  const xpBarRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const hudRefs = [radarRef, statsHudRef, xpBarRef, labelRef] as React.RefObject<HTMLElement | null>[];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setSeedNodes(buildNodes(stats?.topWeaknesses));
  }, [stats]);

  const handleSelectNode = useCallback((node: TopicNode) => {
    // Map node label to a grammar node slug if possible
    const { GRAMMAR_NODES } = require('@/lib/game/grammar-nodes');
    const match = GRAMMAR_NODES.find((g: any) => 
      g.title.toLowerCase() === node.label.toLowerCase() ||
      g.keywords.some((k: string) => k.toLowerCase() === node.label.toLowerCase())
    );
    if (match) {
      router.push(`/skill-tree/${match.slug}`);
    } else {
      router.push(`/skill-tree?topic=${encodeURIComponent(node.label)}`);
    }
  }, [router]);

  const levelInfo = useMemo(() => getLevelInfo(stats?.diveDepth ?? 0), [stats?.diveDepth]);

  const radarSkills: RadarSkill[] = useMemo(() => {
    const empty = [
      { label: 'Grammar', value: 0 },
      { label: 'Vocabulary', value: 0 },
      { label: 'Nativeness', value: 0 },
      { label: 'Complexity', value: 0 },
      { label: 'Initiative', value: 0 },
    ];
    if (!stats) return empty;
    const weaknesses = stats.topWeaknesses ?? [];
    const totalErrors = weaknesses.reduce((s, w) => s + w.count, 0);
    const avgWeakPenalty = weaknesses.length > 0 ? totalErrors / weaknesses.length : 0;
    const grammar = Math.max(10, Math.min(100, 100 - avgWeakPenalty * 10));
    const nativeness = Math.max(10, Math.min(100, 100 - totalErrors * 4));
    const skills = [
      { label: 'Grammar', value: Math.round(grammar) },
      { label: 'Vocabulary', value: stats.avgVocabulary ?? 50 },
      { label: 'Nativeness', value: Math.round(nativeness) },
      { label: 'Complexity', value: stats.avgComplexity ?? 50 },
      { label: 'Initiative', value: stats.avgFluency ?? 50 },
    ];
    return [...skills].sort((a, b) => a.value - b.value);
  }, [stats]);

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: isDark ? '#060D1F' : 'var(--background)' }} suppressHydrationWarning>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(100,180,255,0.8)', textTransform: 'uppercase' }}
        >
          Scanning Depths…
        </motion.div>
      </div>
    );
  }

  if (error && !stats) {
    return <ErrorScreen code="API_FLT" title="Data Link Severed" message={error || 'The stats API crashed silently.'} onReset={refetch} />;
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex" style={{ background: isDark ? '#060D1F' : 'var(--background)' }} suppressHydrationWarning>

      {/* Background */}
      <AnimatePresence mode="wait">
        {!isAbyss ? (
          <motion.div key="arctic" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            {/* Deep navy gradient */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(160deg, #060D1F 0%, #081525 40%, #050F1E 100%)',
            }} />
            {/* Subtle aurora top-left */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 70% 40% at 20% 0%, rgba(30,80,200,0.14) 0%, transparent 70%)',
            }} />
            {/* Subtle aurora top-right */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 60% 35% at 85% 5%, rgba(80,40,200,0.10) 0%, transparent 65%)',
            }} />
          </motion.div>
        ) : (
          <motion.div key="abyss" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.8 }}
            style={{ background: 'radial-gradient(ellipse 130% 90% at 50% -10%, #010c1e 0%, #000812 55%, #000000 100%)' }}
          >
            <div className="absolute inset-0" style={{
              backgroundImage: `
                radial-gradient(circle at 18% 82%, rgba(0,50,120,0.38) 0%, transparent 48%),
                radial-gradient(circle at 80% 18%, rgba(0,70,160,0.28) 0%, transparent 44%),
                radial-gradient(circle at 50% 50%, rgba(0,180,200,0.05) 0%, transparent 68%)
              `,
            }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="abyss-grid" width="56" height="56" patternUnits="userSpaceOnUse">
                  <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#00d4d4" strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#abyss-grid)" />
            </svg>
            <AbyssBackground depth={depth} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Surface state ── */}
      {!isAbyss && (
        <div className="absolute inset-0 z-10 flex flex-col md:flex-row overflow-hidden">

          {/* ─── Left column: scrollable content ─── */}
          <div className="flex flex-col overflow-y-auto overflow-x-hidden pb-[160px] md:pb-6 md:w-[380px] md:shrink-0 md:border-r md:border-white/5">

          {/* ── Compact header ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="pb-0 px-5 flex items-center justify-between shrink-0"
            style={{ paddingTop: 'max(2rem, calc(1rem + env(safe-area-inset-top, 0px)))' }}
          >
            <div className="flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 0 8px rgba(59,130,246,0.7)' }} />
              <span style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(150,190,255,0.55)', textTransform: 'uppercase' }}>
                Depth Profile
              </span>
            </div>
            <span style={{ fontFamily: SF, fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, background: 'linear-gradient(135deg, #FFFFFF 30%, rgba(160,200,255,0.85) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {depth === 0 ? 'Surface' : (isAbyss ? 'Abyss' : 'Diving')}
            </span>
          </motion.div>



          {/* ── Language Skills ── */}
          <div className="mx-5 shrink-0 mb-2 mt-3">
            <LanguageSkills stats={stats} isDark={isDark} />
          </div>

          {/* ── CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-5 mt-4 mb-4 shrink-0"
          >
            <div onClick={() => router.push('/chat?picker=true')} className="cursor-pointer">
              <motion.div
                className="relative flex items-center justify-center gap-2.5 overflow-hidden cursor-pointer"
                style={{ height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 40%, #7C3AED 100%)', boxShadow: '0 4px 20px rgba(37,99,235,0.4), 0 1px 0 rgba(255,255,255,0.12) inset' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)', borderRadius: 14 }}
                  animate={{ x: ['-120%', '220%'] }}
                  transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }} />
                <MessageSquare className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.9)' }} />
                <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Break the Ice
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Mobile-only: iceberg preview at bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.2 }}
            className="md:hidden shrink-0 w-full h-[250px] min-h-[250px]"
            style={{ marginTop: 16 }}
          >
            <IcebergIllustration progress={depth / 15} />
          </motion.div>

          </div>{/* end left column */}

          {/* ─── Right column: Iceberg Display (desktop only) ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1.4 }}
            className="hidden md:flex flex-1 min-w-0 h-full items-center justify-center p-6 lg:p-12"
            style={{ minWidth: 0 }}
          >
            <div className="w-full max-w-2xl aspect-[10/7] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 relative">
              <IcebergIllustration progress={depth / 15} />
            </div>
          </motion.div>

        </div>
      )}

      {/* ── Abyss state ── */}
      {isAbyss && (
        <>
          <BubblePhysicsLayer seedNodes={seedNodes} onSelectNode={handleSelectNode} isMobile={isMobile} hudRefs={hudRefs} />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
            {[220, 160, 90].map((r, i) => (
              <motion.div key={r} className="absolute rounded-full"
                style={{ width: r * 2, height: r * 2, border: '1px solid rgba(0,212,212,0.07)' }}
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.015, 1] }}
                transition={{ duration: 4 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }} />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
            <motion.div className="flex flex-col items-center"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <div className="text-[68px] md:text-[80px] font-black leading-none tracking-[-0.06em]"
                style={{ color: 'transparent', WebkitTextStroke: '1px rgba(0,212,212,0.22)', fontFamily: SF }}>
                {depth}m
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.4em]" style={{ color: 'rgba(0,212,212,0.18)', fontFamily: SF }}>
                depth
              </div>
            </motion.div>
          </div>

          <SkillRadarHUD skills={radarSkills} containerRef={radarRef} />

          <motion.div ref={statsHudRef} className="absolute top-3 right-3 z-20 space-y-1.5"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 22 }}>
            {[
              { icon: Flame, label: 'Streak', value: `${stats?.streak ?? 0}d`, color: '#FBBF24', glow: 'rgba(251,191,36,0.4)' },
              { icon: Target, label: 'Depth', value: `${depth}m`, color: '#22D3EE', glow: 'rgba(34,211,238,0.4)' },
              { icon: BarChart2, label: 'Level', value: levelInfo.level, color: '#A78BFA', glow: 'rgba(167,139,250,0.4)' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2"
                style={{
                   background: 'rgba(0,6,18,0.85)',
                   border: `1px solid ${item.color}18`,
                   borderRadius: 12,
                  padding: isMobile ? '6px 10px' : '7px 12px',
                  minWidth: isMobile ? 90 : 112,
                  boxShadow: `inset 0 1px 0 ${item.color}08`,
                }}>
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}22` }}>
                  <item.icon className="w-2.5 h-2.5" style={{ color: item.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', fontFamily: SF }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, lineHeight: 1.2, color: item.color, textShadow: `0 0 10px ${item.glow}`, fontFamily: SF }}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>



          <motion.div ref={xpBarRef}
            className="absolute bottom-24 md:bottom-6 right-3 z-20"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: 'rgba(0,6,18,0.88)',
              border: '1px solid rgba(167,139,250,0.14)',
              borderRadius: 16,
              padding: isMobile ? '10px 12px' : '12px 16px',
              minWidth: isMobile ? 150 : 180,
            }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', fontFamily: SF }}>
                Level {levelInfo.level}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(167,139,250,0.6)', fontFamily: SF }}>
                {levelInfo.depthInLevel}m / {levelInfo.isMax ? '200m' : `${levelInfo.nextDepth - (levelInfo.minDepth)}m`}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #6D28D9)', boxShadow: '0 0 10px rgba(139,92,246,0.6)' }}
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progress}%` }}
                transition={{ duration: 1.4, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }} />
            </div>
          </motion.div>

          {radarSkills.every(s => s.value === 0) && (
            <motion.div className="absolute inset-x-0 flex justify-center z-20"
              style={{ bottom: isMobile ? '130px' : '80px' }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7 }}>
              <Link href="/chat">
                <motion.div
                  className="flex items-center gap-2 cursor-pointer relative overflow-hidden"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 50,
                    background: 'rgba(0,212,212,0.1)',
                    border: '1px solid rgba(0,212,212,0.35)',
                  }}
                  animate={{ boxShadow: ['0 0 20px rgba(0,212,212,0.12)', '0 0 36px rgba(0,212,212,0.3)', '0 0 20px rgba(0,212,212,0.12)'] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}>
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(0,212,212,0.14) 50%, transparent 65%)' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5 }} />
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(0,212,212,0.9)' }} />
                  <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, color: 'rgba(0,212,212,0.9)', letterSpacing: '0.02em' }}>
                    Start chatting to fill your radar
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          )}

          <motion.div ref={labelRef} className="absolute top-3 left-3 z-20"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}>
            <h1 style={{ fontFamily: SF, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(0,212,212,0.5)' }}>
              Ego Map
            </h1>
            <p style={{ fontFamily: SF, fontSize: 10, marginTop: 2, color: 'rgba(255,255,255,0.14)' }}>
              Tap a node → Topic
            </p>
          </motion.div>

          <motion.div className="absolute top-14 left-3 z-20 space-y-1.5 hidden md:block"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            {[
              { color: '#22D3EE', label: 'Mastered ≥80%' },
              { color: '#F59E0B', label: 'Developing 50–79%' },
              { color: '#EC4899', label: 'Needs Work <50%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                <span style={{ fontFamily: SF, fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)' }}>
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
