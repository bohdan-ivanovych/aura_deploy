import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Link, MoreHorizontal, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import { haptics } from '@/lib/utils/haptics';
import { PLATFORM_LABELS, Platform } from './constants';
import { ReelType } from '@/hooks/useReelGenerator';

interface Props {
  selectedType: ReelType;
  videoUrl: string;
  webmBlob: Blob | null;
  mp4Blob: Blob | null;
  caption: string;
  setCaption: (c: string) => void;
  platform: Platform;
  setPlatform: (p: Platform) => void;
  SPRING: any;
  onRedo: () => void;
  handleShareWrapper: (targetPlatform?: Platform) => Promise<void>;
  shareStatus: 'idle' | 'sharing';
  handleSaveVideo: () => void;
  handleCopyLink: () => void;
}

export function ReelShare({
  selectedType,
  videoUrl,
  caption,
  setCaption,
  platform,
  setPlatform,
  SPRING,
  onRedo,
  handleShareWrapper,
  shareStatus,
  handleSaveVideo,
  handleCopyLink
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  return (
    <motion.div key="share" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}
      className="px-4 pb-8 flex flex-col gap-4"
    >
      <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: 280, background: '#000' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted={muted}
          playsInline
        />
        <button
          onClick={() => setMuted(m => !m)}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div className="flex gap-2">
        {(['tiktok', 'reels', 'shorts', 'twitter'] as Platform[]).map(p => (
          <button key={p} onClick={() => { haptics.light(); setPlatform(p); }}
            className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all"
            style={{
              background: platform === p ? 'rgba(0,212,212,0.12)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
              border: platform === p ? '1px solid rgba(0,212,212,0.3)' : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              color: platform === p ? '#00d4d4' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
            }}>
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
            Caption
          </label>
          <span className="text-[9px]" style={{ color: platform === 'twitter' && caption.length > 280 ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') }}>
            {caption.length}{platform === 'twitter' ? '/280' : ''}
          </span>
        </div>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl text-xs leading-relaxed resize-none outline-none"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`,
            color: isDark ? 'rgba(255,255,255,0.8)' : '#1D1D1F',
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['#englishmistakes', '#englishlevel', '#learnenglish'].map(tag => (
          <button key={tag} onClick={() => setCaption(caption + '\n' + tag)}
            className="px-2.5 py-1 rounded-lg text-[9px] font-semibold"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'}`, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
            + {tag}
          </button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => handleShareWrapper(platform)}
        disabled={shareStatus === 'sharing'}
        className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #00d4d4 0%, #0098db 100%)', color: '#000', boxShadow: '0 8px 28px rgba(0,212,212,0.4)' }}
      >
        {shareStatus === 'sharing'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : `Share to ${PLATFORM_LABELS[platform]}`}
      </motion.button>

      <div className="flex gap-2">
        <button onClick={handleSaveVideo}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[11px] font-bold"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
          <Download className="w-3.5 h-3.5" /> Save
        </button>
        <button onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[11px] font-bold"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
          <Link className="w-3.5 h-3.5" /> Copy link
        </button>
        <button onClick={() => handleShareWrapper()}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[11px] font-bold"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
          <MoreHorizontal className="w-3.5 h-3.5" /> More
        </button>
      </div>

      <button onClick={onRedo}
        className="py-2 text-center text-[11px] font-bold"
        style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
        ← Try a different type
      </button>
    </motion.div>
  );
}
