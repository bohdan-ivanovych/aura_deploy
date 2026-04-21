'use client';

/**
 * MobileWordTray — compact floating glass card (no backdrop/overlay).
 * Sits above the bottom nav so you can still scroll and select more words.
 * Driven by global 'word-popup-open' / 'word-popup-close' events.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Volume2, X, Loader2, Check } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import { toast } from 'sonner';

interface WordPayload {
  word: string;
  translation: string | null;
  explanation: string | null;
  isTranslating: boolean;
  isPhrase: boolean;
  contextSentence: string;
  voiceId?: string | null;
}

declare global {
  interface WindowEventMap {
    'word-popup-open': CustomEvent<WordPayload>;
    'word-popup-close': CustomEvent<void>;
  }
}

const audioUrlCache = new Map<string, string>();

export function MobileWordTray() {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [payload, setPayload] = useState<WordPayload | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const accentColor = isDark ? '#00d4d4' : '#007AFF';

  useEffect(() => {
    const handleOpen = (e: CustomEvent<WordPayload>) => {
      setPayload(e.detail);
      setSaved(false);
      setIsPlayingAudio(false);
    };
    const handleClose = () => setPayload(null);
    window.addEventListener('word-popup-open', handleOpen);
    window.addEventListener('word-popup-close', handleClose);
    return () => {
      window.removeEventListener('word-popup-open', handleOpen);
      window.removeEventListener('word-popup-close', handleClose);
    };
  }, []);

  const dismiss = () => {
    window.dispatchEvent(new CustomEvent('word-popup-close'));
    window.getSelection()?.removeAllRanges();
    setPayload(null);
  };

  const playAudio = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!payload || isPlayingAudio) return;
    const key = `${payload.word}|||${payload.voiceId ?? 'default'}`;
    setIsPlayingAudio(true);
    try {
      let url = audioUrlCache.get(key);
      if (!url) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: payload.word, voiceId: payload.voiceId ?? null }),
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        audioUrlCache.set(key, url);
      }
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch {
      setIsPlayingAudio(false);
      toast.error('Could not play audio');
    }
  };

  const saveCard = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!payload || isSaving || saved) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/create-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: payload.word,
          back: payload.translation || '',
          type: 'translation',
          contextSentence: payload.contextSentence,
          englishExplanation: payload.explanation || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        toast.success(payload.isPhrase ? '📖 Phrase saved!' : '✨ Word saved!', {
          description: `"${payload.word}" added to your deck.`,
        });
        // Don't auto-dismiss — let user pick another word
        setTimeout(() => {
          setSaved(false);
          // fire close so ClickableWordText can reset
          window.dispatchEvent(new CustomEvent('word-popup-close'));
          setPayload(null);
        }, 1000);
      } else if (res.status === 409 || data?.error?.includes('already in')) {
        toast.info('Already in your deck');
        dismiss();
      } else {
        throw new Error(data?.error || 'Failed');
      }
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {payload && (
        // NO backdrop — user must be able to keep tapping words
        <motion.div
          key="word-tray"
          initial={{ y: 24, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 36, mass: 0.75 }}
          className="fixed left-3 right-3 z-[90] md:hidden mobile-word-tray"
          style={{
            // Sit above the bottom nav (68px) + safe area with a gap
            bottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 10px)',
          }}
        >
          {/* Outer glass shell — backdrop-filter here, NO overflow */}
          <div
            style={{
              borderRadius: 22,
              backdropFilter: 'blur(52px) saturate(220%)',
              WebkitBackdropFilter: 'blur(52px) saturate(220%)',
              background: isDark ? 'rgba(10,12,24,0.88)' : 'rgba(255,255,255,0.88)',
              border: `1px solid ${isDark ? 'rgba(0,212,212,0.22)' : 'rgba(0,122,255,0.18)'}`,
              boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 2px 0 rgba(255,255,255,0.08) inset',
            }}
          >
            {/* Inner content — overflow:hidden lives HERE, not on the outer div */}
            <div style={{ borderRadius: 'inherit', overflow: 'hidden' }}>

              {/* Header row */}
              <div className="flex items-center gap-2 px-4 pt-3.5 pb-3"
                style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` }}>
                {/* Word display */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[17px] font-black tracking-tight leading-snug" style={{ color: payload.isPhrase ? '#e040fb' : accentColor, wordBreak: 'break-word' }}>
                    {payload.word}
                  </p>
                  
                  <div className="mt-1">
                    {payload.isTranslating ? (
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: accentColor }} />
                        <span className="text-[11px] italic">Translating...</span>
                      </div>
                    ) : (
                      <p className="text-[14px] font-semibold leading-snug"
                        style={{ color: isDark ? 'rgba(160,220,255,0.85)' : '#007AFF', wordBreak: 'break-word' }}>
                        {payload.translation || '—'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges and Close button */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{
                      background: payload.isPhrase ? 'rgba(224,64,251,0.14)' : `${accentColor}18`,
                      color: payload.isPhrase ? '#e040fb' : accentColor,
                      border: `1px solid ${payload.isPhrase ? 'rgba(224,64,251,0.28)' : `${accentColor}30`}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {payload.isPhrase ? `${payload.word.split(' ').length}w` : 'Word'}
                  </span>

                  {/* Close */}
                  <button
                    onClick={dismiss}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors active:bg-white/10"
                    style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }} />
                  </button>
                </div>
              </div>

              {/* Usage example — provided if explanation exists (even for up to 3-word phrases) */}
              {payload.explanation && (
                <div className="px-4 py-2.5"
                  style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
                  <p className="text-[12px] leading-snug italic"
                    style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)' }}>
                    {payload.explanation}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-stretch h-11">
                <button
                  onClick={playAudio}
                  disabled={isPlayingAudio}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-all disabled:opacity-50 active:bg-white/5"
                  style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}
                >
                  {isPlayingAudio
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: accentColor }} />
                    : <Volume2 className="w-3.5 h-3.5" style={{ color: accentColor }} />}
                  Listen
                </button>

                <div className="w-px" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />

                <button
                  onClick={saveCard}
                  disabled={isSaving || saved}
                  className="flex-[2] flex items-center justify-center gap-1.5 text-[13px] font-bold transition-all disabled:opacity-70 active:brightness-90"
                  style={{
                    background: saved ? 'rgba(52,211,153,0.14)' : `${accentColor}14`,
                    color: saved ? '#34d399' : accentColor,
                  }}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                  {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Add to Deck'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
