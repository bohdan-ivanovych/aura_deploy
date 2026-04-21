'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { CountUp } from '../ui/CountUp';
import { NAV_ITEMS, SPRING_OPTIONS } from '@/lib/config';
import { useStats } from '@/lib/contexts/stats-context';
import { getLevelInfo } from '@/lib/game/levels';
import { Sparkles, Anchor, Flame } from 'lucide-react';

import { useTheme } from '@/lib/contexts/theme-context';
import { useTabContext, TAB_ROUTES, type TabRoute } from '@/lib/contexts/tab-context';

const NAV_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  '/':           { from: '#00d4d4', to: '#0098db', glow: 'rgba(0,212,212,0.5)' },
  '/chat':       { from: '#e040fb', to: '#9c27b0', glow: 'rgba(224,64,251,0.5)' },
  '/flashcards': { from: '#00e676', to: '#00bcd4', glow: 'rgba(0,230,118,0.5)' },
  '/stats':      { from: '#a78bfa', to: '#7c3aed', glow: 'rgba(167,139,250,0.5)' },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, setActiveTab } = useTabContext();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const { stats } = useStats();
  const levelInfo = getLevelInfo(stats?.diveDepth ?? 0);
  const { level, progress } = levelInfo;
  const depthToNext = levelInfo.isMax ? 0 : levelInfo.nextDepth - (stats?.diveDepth ?? 0);

  return (
    <aside className="w-full h-full flex flex-col relative z-40 overflow-hidden rounded-[34px] shadow-2xl"
      style={{
        background: isDark ? 'rgba(15, 17, 26, 0.95)' : 'rgba(255,255,255,0.95)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.02), 0 24px 64px -12px rgba(0,0,0,1)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.02), 0 16px 32px -8px rgba(0,0,0,0.15)',
        transform: 'translateZ(0)',
        isolation: 'isolate',
        backfaceVisibility: 'hidden',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] pointer-events-none rounded-[34px]"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 70%, transparent 100%)'
            : 'transparent',
          opacity: 0.8
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-56 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(0,212,212,0.07) 0%, transparent 70%)' }} />

      <div className="flex flex-col h-full px-3 py-6 relative">

        {/* Logo */}
        <div className="px-2 mb-7">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                boxShadow: '0 0 20px rgba(0,212,212,0.45), inset 0 1px 0 rgba(255,255,255,0.3)'
              }}>
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-[18px] font-black text-[var(--foreground)] tracking-[-0.06em] leading-none">Aura</h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--foreground-subtle)] mt-0.5">Language AI</p>
            </div>
          </div>
        </div>

        {/* Stats Widget */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_OPTIONS}
            className="px-1 mb-6"
          >
            <div className="p-4 rounded-[20px] space-y-3"
              style={{
                background: 'var(--sidebar-widget-bg)',
                border: '1px solid var(--sidebar-widget-border)',
                boxShadow: 'inset 0 1px 0 var(--sidebar-widget-inset)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-quaternary)] flex items-center justify-center">
                    <Flame className="w-3 h-3 text-black" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--foreground-subtle)]">Streak</p>
                    <p className="text-lg font-black tracking-[-0.04em] text-[var(--foreground)] leading-none">
                      {stats ? <><CountUp value={stats.streak ?? 0} /><span className="text-xs ml-0.5 opacity-50">d</span></> : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <Anchor className="w-3 h-3 text-black" />
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--foreground-subtle)]">Depth</p>
                    <p className="text-lg font-black tracking-[-0.04em] leading-none" style={{ color: 'var(--accent-cyan)' }}>
                      {stats ? <><CountUp value={stats.diveDepth} /><span className="text-xs ml-0.5">m</span></> : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Level progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--foreground-subtle)]">
                    Level {level}
                  </span>
                  <span className="text-[9px] font-black text-[var(--accent-cyan)]">{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sidebar-progress-track)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.2, ease: 'circOut', delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #00d4d4, #0098db)',
                      boxShadow: '0 0 8px rgba(0,212,212,0.6)'
                    }}
                  />
                </div>
                <p className="text-[9px] text-[var(--foreground-subtle)] font-medium">
                  {stats ? (levelInfo.isMax ? 'Max Level!' : `${depthToNext}m to Level ${level + 1}`) : ''}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="font-black uppercase tracking-[0.28em] text-[var(--foreground-subtle)] px-3 mb-2" style={{ fontSize: '11px' }}>Menu</p>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const isTab = (TAB_ROUTES as readonly string[]).includes(item.href);
            const isCurrentPathTab = (TAB_ROUTES as readonly string[]).includes(pathname as TabRoute);
            
            const isActive = (isTab && isCurrentPathTab)
              ? activeTab === item.href
              : item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const colors = NAV_COLORS[item.href] || NAV_COLORS['/'];

            const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
              if (isTab) {
                e.preventDefault();
                window.history.pushState(null, '', item.href);
                setActiveTab(item.href as TabRoute);
              } else {
                // Link component handles its own navigation if we don't preventDefault
              }
            };

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={!isTab}
                onClick={handleNavigation}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group overflow-hidden active:scale-[0.98] cursor-pointer select-none hover:bg-transparent hover:!bg-transparent"
                style={{
                  background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                  border: isActive ? '1px solid var(--nav-active-border)' : '1px solid transparent',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${colors.from}0a 0%, ${colors.to}05 100%)`,
                      border: `1px solid ${colors.from}22`,
                    }}
                    transition={SPRING_OPTIONS}
                  />
                )}
                <div className="relative w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all"
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                    boxShadow: `0 0 12px ${colors.glow}`,
                  } : {
                    background: 'var(--nav-icon-idle)',
                  }}
                >
                  <item.icon className={clsx(
                    'w-3.5 h-3.5 transition-colors',
                    isActive ? 'text-black' : 'text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)]'
                  )} />
                </div>
                <span className={clsx(
                  'relative text-[13px] font-bold tracking-tight transition-colors',
                  isActive ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)] group-hover:text-[var(--foreground)]'
                )}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-dot"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: colors.from,
                      boxShadow: `0 0 6px ${colors.glow}`
                    }}
                    transition={SPRING_OPTIONS}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pt-4 border-t border-[var(--border-subtle)]">
          <p className="font-medium text-[var(--foreground-subtle)] tracking-wide" style={{ fontSize: '11px' }}>
            Powered by Groq · Aura v0.1
          </p>
        </div>
      </div>
    </aside>
  );
}
