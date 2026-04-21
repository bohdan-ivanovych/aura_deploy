'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Download, Link, MoreHorizontal } from 'lucide-react';
import { getLevelInfo } from '@/lib/game/levels';
import { toast } from 'sonner';
import { track } from '@/lib/services/analytics';
import { haptics } from '@/lib/utils/haptics';

interface MilestoneSheetProps {
  open: boolean;
  onClose: () => void;
  type: 'depth' | 'streak';
  value: number;
  userName: string | null;
  streak?: number;
  depth?: number;
}

const DEPTH_ZONES: Record<number, string> = {
  25:  'Shallows',
  50:  'Open Water',
  100: 'Deep Zone',
  150: 'Abyss',
  200: 'The Deep End',
};

const STREAK_LABELS: Record<number, string> = {
  7:   '1-week streak',
  14:  '2-week streak',
  30:  '1-month streak',
  60:  '2-month streak',
  100: '100-day legend',
};

export function MilestoneSheet({ open, onClose, type, value, userName, streak, depth }: MilestoneSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0]);

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const displayName = userName || 'Anonymous';
  const levelInfo = getLevelInfo(depth ?? 0);

  const shareText = type === 'depth'
    ? `I just reached ▼${value}m depth on AURA — ${DEPTH_ZONES[value] ?? 'Deep Water'} zone! 🌊 #AuraEnglish`
    : `🔥 ${value}-day streak on AURA! I haven't missed a day of English practice. #AuraEnglish`;
  const shareUrl = 'https://auraos.app';

  type SharePlatform = 'tiktok' | 'instagram' | 'whatsapp' | 'telegram' | 'youtube' | 'snapchat' | 'twitter' | 'facebook';

  const handleShare = useCallback(async (platform?: SharePlatform) => {
    haptics.light();
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl  = encodeURIComponent(shareUrl);

    if (platform) track('milestone_shared', { platform, type });

    if (platform === 'tiktok' || platform === 'instagram' || platform === 'snapchat' || platform === 'youtube') {
      try {
        if (navigator.share) await navigator.share({ title: 'AURA Milestone', text: shareText, url: shareUrl });
      } catch {}
      return;
    }
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank');
      return;
    }
    if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
      return;
    }
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
      return;
    }
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
      return;
    }
    try {
      if (navigator.share) await navigator.share({ title: 'AURA Milestone', text: shareText, url: shareUrl });
      else { await navigator.clipboard.writeText(`${shareText} ${shareUrl}`); toast.success('Link copied'); }
    } catch {}
  }, [shareText, shareUrl, type]);

  const handleCopyLink = useCallback(async () => {
    haptics.light();
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied');
      track('milestone_shared', { platform: 'copy_link', type });
    } catch { toast.error('Could not copy link'); }
  }, [shareUrl, type]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: backdropOpacity }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.2 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) {
                onClose();
              } else {
                dragY.set(0);
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-safe-or-8 pt-3 px-4"
            style={{ maxHeight: '90vh', y: dragY, willChange: 'transform' }}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mb-4 cursor-grab" />

            {/* Card */}
            <div
              className="w-full max-w-sm rounded-[32px] p-7 flex flex-col items-center gap-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #0a0a12 0%, #0d1520 60%, #08080f 100%)',
                border: '1px solid rgba(0,212,212,0.2)',
                boxShadow: '0 0 80px rgba(0,212,212,0.12), 0 40px 80px rgba(0,0,0,0.8)',
              }}
            >
              {/* AURA watermark */}
              <span
                className="absolute top-5 right-6 text-xs font-black tracking-[0.3em]"
                style={{ color: 'rgba(255,255,255,0.15)' }}
              >
                AURA
              </span>

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>

              {/* Main content */}
              {type === 'depth' ? (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent-cyan)] opacity-70">
                    New Depth Reached
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black font-mono" style={{ color: '#00d4d4' }}>▼</span>
                    <span className="text-7xl font-black font-mono tracking-tighter" style={{ color: '#00d4d4' }}>
                      {value}m
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {DEPTH_ZONES[value] ?? 'Deep Water'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#fb923c', opacity: 0.7 }}>
                    Streak Milestone
                  </span>
                  <div className="text-6xl font-black font-mono tracking-tight" style={{ color: '#fb923c' }}>
                    🔥 {value}
                  </div>
                  <span className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {STREAK_LABELS[value] ?? `${value}-day streak`}
                  </span>
                </div>
              )}

              <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

              {/* User info */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-base font-semibold tracking-tight text-white/80">
                  {displayName}
                </span>
                <div className="flex items-center gap-3 text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {type === 'depth' && (
                    <span>🔥 {streak ?? 0} days</span>
                  )}
                  {type === 'streak' && depth !== undefined && (
                    <span>▼ {depth}m · {levelInfo.rank}</span>
                  )}
                  <span>{date}</span>
                </div>
              </div>
            </div>

            {/* Platform grid */}
            <div className="w-full max-w-sm mt-4">
              <div className="grid grid-cols-4 gap-3">
                {/* TikTok */}
                <button onClick={() => handleShare('tiktok')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M13.5 6.7a3.25 3.25 0 0 1-1.9-.6V11a2.85 2.85 0 1 1-2.3-2.8v1.55a1.35 1.35 0 1 0 .95 1.3V5h1.75a3.25 3.25 0 0 0 1.5 1.7z" fill="white"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">TikTok</span>
                </button>

                {/* Instagram */}
                <button onClick={() => handleShare('instagram')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <defs>
                      <linearGradient id="ig-ms" x1="0" y1="20" x2="20" y2="0">
                        <stop offset="0%" stopColor="#f09433"/>
                        <stop offset="60%" stopColor="#dc2743"/>
                        <stop offset="100%" stopColor="#bc1888"/>
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="16" height="16" rx="5" stroke="url(#ig-ms)" strokeWidth="1.5" fill="none"/>
                    <circle cx="10" cy="10" r="3.5" stroke="url(#ig-ms)" strokeWidth="1.5" fill="none"/>
                    <circle cx="14" cy="6" r="1" fill="url(#ig-ms)"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">Instagram</span>
                </button>

                {/* WhatsApp */}
                <button onClick={() => handleShare('whatsapp')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M10 2a8 8 0 0 0-6.9 12l-1 3.6 3.7-1A8 8 0 1 0 10 2zm0 1.5a6.5 6.5 0 1 1-3.5 12l-.2-.1-2.1.5.5-2-.1-.2A6.5 6.5 0 0 1 10 3.5zm-1.5 3.4c-.2 0-.4 0-.6.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.2 1.4 2.3 3.5 3.2 1.7.7 2 .5 2.4.5.3-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.2-.4-.3l-1.2-.6c-.2-.1-.3-.1-.5.1-.1.2-.5.6-.6.7-.1.1-.3.1-.5 0-.3-.1-1-.4-1.9-1.2-.7-.6-1.1-1.3-1.3-1.6-.1-.2 0-.3.1-.5l.3-.4.2-.4c.1-.1 0-.3-.1-.4l-.5-1.3c-.2-.3-.3-.3-.5-.3z" fill="#25D366"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button onClick={() => handleShare('telegram')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M4 9.75L16 5l-2.5 6.75-2.5-1.75L9 12l-.5-2.25z" fill="#2AABEE"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">Telegram</span>
                </button>

                {/* YouTube Shorts */}
                <button onClick={() => handleShare('youtube')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M17.4 6.2a2.1 2.1 0 0 0-1.5-1.5C14.5 4.4 10 4.4 10 4.4s-4.5 0-5.9.3A2.1 2.1 0 0 0 2.6 6.2 22 22 0 0 0 2.3 10c0 1.3.1 2.6.3 3.8a2.1 2.1 0 0 0 1.5 1.5c1.4.3 5.9.3 5.9.3s4.5 0 5.9-.3a2.1 2.1 0 0 0 1.5-1.5c.2-1.2.3-2.5.3-3.8s-.1-2.6-.3-3.8zM8.3 12.4V7.6l4.4 2.4-4.4 2.4z" fill="#FF0000"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">YT Shorts</span>
                </button>

                {/* Snapchat */}
                <button onClick={() => handleShare('snapchat')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M10 2C7.2 2 5 4.1 5 6.7v.9c-.5.2-1 .3-1.5.3-.2 0-.3.1-.3.3 0 .6.5 1 1.3 1.2.2.8.6 1.5 1.2 2-.5.3-1.2.5-1.8.7-.3.1-.4.4-.1.6.7.4 2.2.8 2.2.8s.3.9 1.4 1c.9.1 1.5-.2 2.6-.2 1.1 0 1.7.3 2.6.2 1.1-.1 1.4-1 1.4-1s1.5-.4 2.2-.8c.3-.2.2-.5-.1-.6-.6-.2-1.3-.4-1.8-.7.6-.5 1-1.2 1.2-2 .8-.2 1.3-.6 1.3-1.2 0-.2-.1-.3-.3-.3-.5 0-1-.1-1.5-.3v-.9C15 4.1 12.8 2 10 2z" fill="#FFFC00"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">Snapchat</span>
                </button>

                {/* X / Twitter */}
                <button onClick={() => handleShare('twitter')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M11.25 9.15 15 5h-.8l-3 3.5L8.5 5h-2.8l4 5.85L5.5 15h.8l3.2-3.7 2.5 3.7H14.8l-3.55-5.85zm-1 1.2-.4-.55-3.1-4.55h1.2l2.25 3.3.35.55 3.2 4.7h-1.2l-2.3-3.45z" fill="white"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">X / Twitter</span>
                </button>

                {/* Facebook */}
                <button onClick={() => handleShare('facebook')} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] active:scale-[0.95] touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20">
                    <path d="M18 10a8 8 0 1 0-9.25 7.9v-5.6H6.9V10h1.85V8.35c0-1.83 1.09-2.84 2.76-2.84.8 0 1.63.14 1.63.14v1.8h-.92c-.9 0-1.18.56-1.18 1.13V10h2l-.32 2.3h-1.68v5.6A8 8 0 0 0 18 10z" fill="#1877F2"/>
                  </svg>
                  <span className="text-[9px] font-medium text-white/50">Facebook</span>
                </button>
              </div>

              {/* Utility row */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[11px] font-bold active:scale-[0.97] touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <Link className="w-3.5 h-3.5" />
                  Copy link
                </button>
                <button
                  onClick={() => handleShare()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[11px] font-bold active:scale-[0.97] touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  More…
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-2 w-full max-w-sm py-3 text-sm font-bold rounded-2xl"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Dismiss
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export const DEPTH_MILESTONES = [25, 50, 100, 150, 200];
export const STREAK_MILESTONES = [7, 14, 30, 60, 100];

export function checkDepthMilestone(prevDepth: number, newDepth: number): number | null {
  for (const m of DEPTH_MILESTONES) {
    if (prevDepth < m && newDepth >= m) return m;
  }
  return null;
}

export function checkStreakMilestone(streak: number): number | null {
  if (STREAK_MILESTONES.includes(streak)) return streak;
  return null;
}
