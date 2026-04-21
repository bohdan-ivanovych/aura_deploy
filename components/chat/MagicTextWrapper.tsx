'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, BookOpen, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/lib/contexts/theme-context';

interface MagicTextWrapperProps {
  children: React.ReactNode;
  fullMessageText: string;
}

const LANG_CODE_TO_NAME: Record<string, string> = {
  uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
  de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
  tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
  no: 'Norwegian', da: 'Danish', fi: 'Finnish', el: 'Greek',
};

let cachedNativeLang: string | null = null;

async function getNativeLang(): Promise<string> {
  if (cachedNativeLang) return cachedNativeLang;
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const code = data?.user?.nativeLanguage || 'uk';
    cachedNativeLang = LANG_CODE_TO_NAME[code] || 'Ukrainian';
  } catch {
    cachedNativeLang = 'Ukrainian';
  }
  return cachedNativeLang!;
}

const POPUP_W = 320;
const INPUT_SAFE_BOTTOM = 120;

function calcPopupStyle(rect: DOMRect, popupH: number) {
  const vvHeight = window.visualViewport?.height ?? window.innerHeight;
  const vvOffsetTop = window.visualViewport?.offsetTop ?? 0;
  const vvOffsetLeft = window.visualViewport?.offsetLeft ?? 0;

  const rawLeft = rect.left - vvOffsetLeft + rect.width / 2;
  const clampedLeft = Math.max(POPUP_W / 2 + 8, Math.min(window.innerWidth - POPUP_W / 2 - 8, rawLeft));

  const rectTopInVV = rect.top - vvOffsetTop;
  const rectBottomInVV = rect.bottom - vvOffsetTop;
  const availableBelow = vvHeight - rectBottomInVV - INPUT_SAFE_BOTTOM;
  const showAbove = rectTopInVV > popupH + 20 && availableBelow < popupH;

  let top: number;
  if (showAbove) {
    top = vvOffsetTop + rectTopInVV - popupH - 10;
  } else {
    const idealTop = vvOffsetTop + rectBottomInVV + 10;
    const maxTop = vvOffsetTop + vvHeight - INPUT_SAFE_BOTTOM - popupH - 4;
    top = Math.min(idealTop, maxTop);
  }
  top = Math.max(vvOffsetTop + 8, top);

  return { top, left: clampedLeft };
}

export default function MagicTextWrapper({ children, fullMessageText }: MagicTextWrapperProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const accentColor = isDark ? '#00d4d4' : '#0891b2';
  const popupBg = isDark ? 'rgba(10,12,20,0.96)' : 'rgba(255,255,255,0.97)';
  const popupBorder = isDark ? `rgba(0,212,212,0.22)` : 'rgba(8,145,178,0.2)';
  const textPrimary = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
  const textMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect | null;
    isPhrase: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      setShowTranslation(false);
      return;
    }

    const selectedText = sel.toString().trim();
    if (selectedText.length < 2) {
      setSelection(null);
      return;
    }

    if (containerRef.current && !containerRef.current.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wordCount = selectedText.trim().split(/\s+/).length;
      setSelection({ text: selectedText, rect, isPhrase: wordCount > 1 });
      setShowTranslation(false);
      setTranslation('');
    } catch {
      setSelection(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, [handleSelection]);

  const fetchTranslation = async () => {
    if (!selection || translation) return;
    try {
      const targetLang = await getNativeLang();
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection.text, targetLang }),
      });
      const data = await res.json();
      setTranslation(data.translated || '');
      setShowTranslation(true);
    } catch {
      setTranslation('—');
      setShowTranslation(true);
    }
  };

  const speak = () => {
    if (!selection || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utt = new SpeechSynthesisUtterance(selection.text);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const saveToDeck = async () => {
    if (!selection || isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/create-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: selection.text,
          back: translation || '',
          type: 'translation',
          contextSentence: fullMessageText,
          englishExplanation: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      toast.success(selection.isPhrase ? '📖 Phrase saved!' : '✨ Word saved!', {
        description: `"${selection.text}" added to your deck.`,
      });

      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setShowTranslation(false);
      setTranslation('');
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dismiss = () => {
    window.speechSynthesis?.cancel();
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowTranslation(false);
    setTranslation('');
    setIsSpeaking(false);
  };

  const popupH = showTranslation && translation ? 120 : 58;
  const popupStyle = selection?.rect ? calcPopupStyle(selection.rect, popupH) : {};

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {children}

      <AnimatePresence>
        {selection && selection.rect && (
          <motion.div
            key="magic-popup"
            initial={{ opacity: 0, scale: 0.88, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            style={{
              position: 'fixed',
              zIndex: 9999,
              width: POPUP_W,
              ...popupStyle,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="overflow-hidden rounded-2xl backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
              style={{
                background: popupBg,
                border: `1px solid ${popupBorder}`,
              }}
            >
              {/* Header: selected text + type badge */}
              <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b"
                style={{ borderColor: dividerColor }}>
                <span className="text-xs font-bold truncate flex-1" style={{ color: textPrimary }}>
                  &ldquo;{selection.text}&rdquo;
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] shrink-0 px-1.5 py-0.5 rounded-full"
                  style={{
                    background: selection.isPhrase ? 'rgba(224,64,251,0.2)' : `${accentColor}20`,
                    color: selection.isPhrase ? '#e040fb' : accentColor,
                    border: `1px solid ${selection.isPhrase ? 'rgba(224,64,251,0.3)' : `${accentColor}40`}`,
                  }}>
                  {selection.isPhrase ? 'Phrase' : 'Word'}
                </span>
              </div>

              {/* Translation row */}
              {showTranslation && translation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-3 py-2 overflow-hidden border-b"
                  style={{ borderColor: dividerColor }}
                >
                  <p className="text-[11px] leading-relaxed" style={{ color: textMuted }}>{translation}</p>
                </motion.div>
              )}

              {/* Action buttons row */}
              <div className="flex items-stretch divide-x" style={{ borderColor: dividerColor }}>
                <button
                  onClick={fetchTranslation}
                  disabled={showTranslation && !!translation}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 transition-all disabled:opacity-40 min-w-0"
                  style={{ color: textMuted }}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                  <span className="text-[9px] font-bold leading-none">{showTranslation ? 'Done' : 'Translate'}</span>
                </button>

                <button
                  onClick={speak}
                  disabled={isSpeaking}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 transition-all"
                  style={{ color: isSpeaking ? accentColor : textMuted }}
                >
                  <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  <span className="text-[9px] font-bold leading-none">{isSpeaking ? 'Playing' : 'Listen'}</span>
                </button>

                <button
                  onClick={saveToDeck}
                  disabled={isLoading}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 transition-all"
                  style={{ color: accentColor }}
                >
                  {isLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    : <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                  <span className="text-[9px] font-bold leading-none">{isLoading ? 'Saving' : 'Add Card'}</span>
                </button>

                <button
                  onClick={dismiss}
                  className="px-3 py-2.5 flex items-center transition-colors"
                  style={{ color: textMuted }}
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
