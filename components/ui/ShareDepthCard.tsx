'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, X, Anchor, Trophy, Flame } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ShareDepthCardProps {
  name: string;
  rank: string;
  level: number;
  depth: number;
  streak: number;
  onClose: () => void;
}

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

function getDepthZone(depth: number) {
  if (depth >= 150) return { label: 'Abyssal Zone', gradient: 'linear-gradient(160deg, #0a0018 0%, #1a0030 40%, #050020 100%)' };
  if (depth >= 100) return { label: 'Midnight Zone', gradient: 'linear-gradient(160deg, #000820 0%, #001040 40%, #000614 100%)' };
  if (depth >= 60) return { label: 'Twilight Zone', gradient: 'linear-gradient(160deg, #001428 0%, #002845 40%, #001020 100%)' };
  if (depth >= 30) return { label: 'Sunlight Zone', gradient: 'linear-gradient(160deg, #002838 0%, #004050 40%, #001830 100%)' };
  return { label: 'Surface', gradient: 'linear-gradient(160deg, #061525 0%, #0a2540 40%, #050f1e 100%)' };
}

export function ShareDepthCard({ name, rank, level, depth, streak, onClose }: ShareDepthCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const zone = getDepthZone(depth);

  const exportCard = useCallback(async (action: 'share' | 'download') => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });

      if (action === 'share' && navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `aura-depth-${depth}m.png`, { type: 'image/png' });
        await navigator.share({
          title: `I've reached ${depth}m depth on Aura`,
          text: `Level ${level} ${rank} · ${streak} day streak 🔥`,
          files: [file],
        });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `aura-depth-${depth}m.png`;
        a.click();
      }
    } catch {
      // User cancelled share or error
    } finally {
      setSaving(false);
    }
  }, [saving, depth, level, rank, streak]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-6"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={SPRING}
          className="flex flex-col items-center gap-5 w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          {/* The card to export */}
          <div
            ref={cardRef}
            className="w-full rounded-[32px] overflow-hidden relative"
            style={{
              background: zone.gradient,
              padding: '40px 32px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            }}
          >
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(0,212,212,0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)' }} />

            {/* Content */}
            <div className="relative space-y-6">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,212,0.25), rgba(167,139,250,0.2))',
                    border: '1px solid rgba(0,212,212,0.3)',
                  }}>
                  <span className="text-lg font-black" style={{ color: '#00d4d4' }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em]"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      {rank}
                    </span>
                  </div>
                </div>
              </div>

              {/* Depth — hero element */}
              <div className="text-center py-4">
                <div className="text-6xl font-black tracking-[-0.06em] leading-none"
                  style={{ color: '#00d4d4', textShadow: '0 0 40px rgba(0,212,212,0.5)' }}>
                  {depth}m
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mt-2"
                  style={{ color: 'rgba(0,212,212,0.5)' }}>
                  {zone.label}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex justify-center gap-6">
                {[
                  { icon: Trophy, label: 'Level', value: level, color: '#a78bfa' },
                  { icon: Flame, label: 'Streak', value: `${streak}d`, color: '#fbbf24' },
                  { icon: Anchor, label: 'Depth', value: `${depth}m`, color: '#00d4d4' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-xs font-black" style={{ color }}>{value}</span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.15em]"
                      style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Branding */}
              <div className="text-center pt-2">
                <span className="text-[10px] font-black tracking-[0.25em] uppercase"
                  style={{ color: 'rgba(255,255,255,0.15)' }}>
                  AURA · Language AI
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                onClick={() => exportCard('share')}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-black disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                  boxShadow: '0 4px 20px rgba(0,212,212,0.35)',
                }}
              >
                <Share2 className="w-4 h-4" />
                {saving ? 'Generating…' : 'Share'}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              onClick={() => exportCard('download')}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Download className="w-4 h-4" />
              Save
            </motion.button>
          </div>

          {/* Close */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
