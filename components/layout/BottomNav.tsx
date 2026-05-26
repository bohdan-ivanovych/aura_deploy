'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/config';
import { useTheme } from '@/lib/contexts/theme-context';
import { useEffect, useState } from 'react';
import { useTabContext, TAB_ROUTES, type TabRoute } from '@/lib/contexts/tab-context';
import { haptics } from '@/lib/utils/haptics';
import { useChatUIStore } from '@/lib/stores/ui-store';

const NAV_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  '/':           { from: '#00d4d4', to: '#0098db', glow: 'rgba(0,212,212,0.7)' },
  '/chat':       { from: '#e040fb', to: '#9c27b0', glow: 'rgba(224,64,251,0.7)' },
  '/flashcards': { from: '#00e676', to: '#00b248', glow: 'rgba(0,230,118,0.7)' },
  '/stats':      { from: '#a78bfa', to: '#7c3aed', glow: 'rgba(167,139,250,0.7)' },
};

export function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isPopupActive, setIsPopupActive] = useState(false);
  const { activeTab, setActiveTab } = useTabContext();
  const [dueCount, setDueCount] = useState(0);
  const { isStudioOpen } = useChatUIStore();

  // Listen for flashcard badge updates instead of polling
  useEffect(() => {
    const updateBadge = (e: Event) => {
      const count = (e as CustomEvent)?.detail?.count;
      if (typeof count === 'number') setDueCount(count);
    };
    window.addEventListener('flashcard-due-update', updateBadge);
    // Initial fetch — once only
    fetch('/api/flashcards?due=1').then(r => r.json()).then(d => {
      setDueCount(d?.cards?.length || 0);
    }).catch(() => {});
    return () => window.removeEventListener('flashcard-due-update', updateBadge);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsPopupActive(true);
    const handleClose = () => setIsPopupActive(false);
    window.addEventListener('word-popup-open', handleOpen);
    window.addEventListener('word-popup-close', handleClose);
    return () => {
      window.removeEventListener('word-popup-open', handleOpen);
      window.removeEventListener('word-popup-close', handleClose);
    };
  }, []);

  if (keyboardOpen) return null;
  if (pathname === '/onboarding') return null;

  const isTabRoute = (TAB_ROUTES as readonly string[]).includes(pathname);

  const getIsActive = (href: string) => {
    if (isTabRoute && (TAB_ROUTES as readonly string[]).includes(href)) {
      return activeTab === href;
    }
    return pathname === href;
  };

  const allItems = NAV_ITEMS;

  const renderItem = (item: typeof NAV_ITEMS[number]) => {
    const isActive = getIsActive(item.href);
    const colors = NAV_COLORS[item.href] || NAV_COLORS['/'];
    const isTab = (TAB_ROUTES as readonly string[]).includes(item.href);

    const content = (
      <motion.div
        whileTap={{ scale: 0.80 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex flex-col items-center justify-center h-full w-full"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Pill — wraps only icon + label */}
        <motion.div
          className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl"
          animate={isActive ? {
            background: isDark
              ? `linear-gradient(135deg, ${colors.from}20, ${colors.to}10)`
              : `linear-gradient(135deg, ${colors.from}18, ${colors.to}0c)`,
            borderColor: `${colors.from}${isDark ? '30' : '28'}`,
          } : {
            background: 'rgba(0,0,0,0)',
            borderColor: 'rgba(0,0,0,0)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            border: '1px solid transparent',
            minWidth: '52px',
          }}
        >
          {/* Glow behind icon when active */}
          {isActive && (
            <motion.div
              layoutId="nav-glow"
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${colors.glow.replace('0.7', '0.18')} 0%, transparent 70%)`,
                filter: 'blur(4px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <div className="relative w-5 h-5 flex items-center justify-center">
            <item.icon
              className="w-5 h-5 transition-all duration-200"
              style={isActive ? {
                color: colors.from,
                filter: `drop-shadow(0 0 8px ${colors.glow})`,
              } : {
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.32)',
              }}
            />
            {item.href === '/flashcards' && dueCount > 0 && (
              <div className="absolute -top-1.5 -right-2 bg-amber-500 min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse border border-amber-300">
                <span className="font-black text-white leading-none tracking-tight" style={{ fontSize: '10px' }}>{dueCount}</span>
              </div>
            )}
          </div>

          <span
            className="font-black tracking-wide leading-none transition-all duration-200"
            style={{
              fontSize: '11px', /* minimum — non-negotiable */
              color: isActive
                ? colors.from
                : (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'),
              textShadow: isActive && isDark ? `0 0 10px ${colors.glow}` : 'none',
            }}
          >
            {item.name}
          </span>
        </motion.div>

        {/* Bottom dot */}
        {isActive && (
          <motion.div
            layoutId="bottom-dot"
            className="absolute bottom-1.5 w-1 h-1 rounded-full"
            style={{
              background: colors.from,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </motion.div>
    );

    if (isTab) {
      return (
        <Link
          key={item.name}
          href={item.href}
          onClick={(e) => { 
            e.preventDefault(); 
            haptics.light(); 
            window.history.pushState(null, '', item.href);
            setActiveTab(item.href as TabRoute); 
          }}
          className="relative flex items-center justify-center h-full w-full tap-target hover:bg-transparent hover:!bg-transparent"
          aria-label={item.name}
          aria-current={isActive ? 'page' : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        prefetch={true}
        className="relative flex items-center justify-center h-full w-full tap-target hover:bg-transparent hover:!bg-transparent"
        onClick={() => haptics.light()}
        aria-label={item.name}
        aria-current={isActive ? 'page' : undefined}
      >
        {content}
      </Link>
    );
  };

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={`fixed z-[100] md:hidden select-none transition-transform duration-300 ${isPopupActive || isStudioOpen ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      style={{ 
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        left: '20px',
        right: '20px',
        height: '68px', 
        willChange: 'transform',
        transitionProperty: 'transform, opacity'
      }}
    >
      <div
        className="absolute inset-0 rounded-[34px] flex items-center shadow-2xl"
        style={{
          background: 'var(--nav-bg, var(--surface))',
          backdropFilter: 'var(--glass-blur, blur(40px)) saturate(250%)',
          WebkitBackdropFilter: 'var(--glass-blur, blur(40px)) saturate(250%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--nav-shadow)',
          backfaceVisibility: 'hidden' as const,
        }}
      >
        {/* Iridescent top highlight line inside the overflow */}
        <div
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none rounded-[34px]"
          style={{
            background: 'var(--nav-highlight, transparent)',
            opacity: 0.8
          }}
        />

        <div className="relative h-full w-full grid grid-cols-4 px-2 items-center">
          {allItems.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}
