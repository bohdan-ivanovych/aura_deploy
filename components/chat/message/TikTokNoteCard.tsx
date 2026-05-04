'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { haptics } from '@/lib/utils/haptics';
import ClickableWordText from '@/components/chat/ClickableWordText';
import type { ShortVideoPlatform } from '@/lib/ai/video-processor';

export interface TikTokNoteData {
  platform?: ShortVideoPlatform;
  videoTitle: string;
  authorName: string;
  thumbnailUrl: string | null;
  noteType: 'english_phrase' | 'cross_language';
  phrase: string;
  explanation: string;
  examples: string[];
  funFact: string | null;
}

interface TikTokNoteCardProps {
  data: TikTokNoteData;
}

// Per-platform accent colors
const PLATFORM_CONFIG: Record<string, { hex: string; rgb: string; label: string; emoji: string }> = {
  tiktok: { hex: '#0891b2', rgb: '8,145,178',   label: 'TikTok Note',  emoji: '🎵' },
  shorts: { hex: '#dc2626', rgb: '220,38,38',    label: 'Shorts Note',  emoji: '▶️' },
  reels:  { hex: '#9333ea', rgb: '147,51,234',   label: 'Reels Note',   emoji: '📱' },
};

export function TikTokNoteCard({ data }: TikTokNoteCardProps) {
  const [expanded, setExpanded] = useState(true);

  const cfg = PLATFORM_CONFIG[data.platform ?? 'tiktok'] ?? PLATFORM_CONFIG.tiktok;
  const ACCENT_HEX = cfg.hex;
  const ACCENT_RGB = cfg.rgb;
  const platformLabel = cfg.label;
  const platformEmoji = cfg.emoji;
  const typeLabel = data.noteType === 'cross_language' ? 'Cross-Language' : 'English Phrase';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26, delay: 0.1 }}
      className="mt-4 rounded-2xl overflow-hidden shadow-sm"
      style={{
        border: `1px solid rgba(${ACCENT_RGB}, 0.2)`,
        background: `rgba(${ACCENT_RGB}, 0.02)`,
      }}
    >
    {/* Header — use div + role to avoid nested <button> hydration error */}

      <div
        role="button"
        tabIndex={0}
        onClick={() => { setExpanded(e => !e); haptics.light(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setExpanded(ex => !ex); haptics.light(); } }}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors cursor-pointer"
        style={{
          background: `rgba(${ACCENT_RGB}, 0.09)`,
          borderBottom: expanded ? `1px solid rgba(${ACCENT_RGB}, 0.13)` : 'none',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: ACCENT_HEX, boxShadow: `0 0 8px ${ACCENT_HEX}` }}
          />
          <span className="text-[10px]">{platformEmoji}</span>
          <span
            className="text-[9px] font-black uppercase tracking-[0.15em]"
            style={{ color: ACCENT_HEX }}
          >
            {platformLabel} · {typeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              const copyText = `${data.phrase}\n${data.explanation}`;
              navigator.clipboard.writeText(copyText);
              haptics.light();
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigator.clipboard.writeText(`${data.phrase}\n${data.explanation}`); } }}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors active:scale-90 cursor-pointer"
            style={{ color: ACCENT_HEX }}
          >
            <Copy className="w-3 h-3 opacity-60" />
          </div>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 opacity-40" style={{ color: ACCENT_HEX }} />
            : <ChevronDown className="w-3.5 h-3.5 opacity-40" style={{ color: ACCENT_HEX }} />
          }
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 py-3.5 space-y-3"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)' }}
            >
              {/* Video meta (if available) */}
              {(data.videoTitle || data.authorName) && (
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px]"
                  style={{
                    background: `rgba(${ACCENT_RGB}, 0.06)`,
                    border: `1px solid rgba(${ACCENT_RGB}, 0.12)`,
                  }}
                >
                  {/* TikTok icon pill */}
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-sm"
                    style={{ background: `rgba(${ACCENT_RGB}, 0.15)` }}
                  >
                    🎵
                  </div>
                  <div className="flex-1 min-w-0">
                    {data.videoTitle && (
                      <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {data.videoTitle}
                      </p>
                    )}
                    {data.authorName && (
                      <p className="text-[10px] opacity-60" style={{ color: 'var(--foreground)' }}>
                        @{data.authorName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Phrase highlight */}
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-50" style={{ color: ACCENT_HEX }}>
                  {data.noteType === 'cross_language' ? 'Key Concept' : 'Phrase'}
                </p>
                <div className="text-[17px] font-black leading-snug" style={{ color: ACCENT_HEX }}>
                  "<ClickableWordText text={data.phrase} voiceId={null} fullMessageText={data.phrase} />"
                </div>
              </div>

              {/* Explanation */}
              {data.explanation && (
                <div className="pt-0.5 border-t border-white/5">
                  <p className="text-[12px] leading-relaxed font-medium" style={{ color: 'var(--foreground-muted)' }}>
                    {data.explanation}
                  </p>
                </div>
              )}

              {/* Examples */}
              {data.examples && data.examples.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-40" style={{ color: 'var(--foreground)' }}>
                    Examples
                  </p>
                  <div className="space-y-1">
                    {data.examples.map((ex, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0"
                          style={{ background: `rgba(${ACCENT_RGB}, 0.5)` }}
                        />
                        <div className="text-[12px] leading-snug italic w-full" style={{ color: 'var(--foreground-muted)' }}>
                          "<ClickableWordText text={ex} voiceId={null} fullMessageText={ex} />"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fun Fact */}
              {data.funFact && (
                <div
                  className="px-3 py-2.5 rounded-xl"
                  style={{
                    background: `rgba(${ACCENT_RGB}, 0.06)`,
                    border: `1px solid rgba(${ACCENT_RGB}, 0.15)`,
                  }}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: `rgba(${ACCENT_RGB}, 0.7)` }}>
                    💡 Did you know?
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                    {data.funFact}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
