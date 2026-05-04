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

const POPUP_W = 280;
const POPUP_W_DESKTOP = 320;
const INPUT_SAFE_BOTTOM = 120;

function calcPopupStyle(rect: DOMRect, popupH: number, popupW: number = POPUP_W) {
  const vvHeight = window.visualViewport?.height ?? window.innerHeight;
  const vvOffsetTop = window.visualViewport?.offsetTop ?? 0;
  const vvOffsetLeft = window.visualViewport?.offsetLeft ?? 0;

  const rawLeft = rect.left - vvOffsetLeft + rect.width / 2;
  const clampedLeft = Math.max(popupW / 2 + 8, Math.min(window.innerWidth - popupW / 2 - 8, rawLeft));

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
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNativeLang();
  }, []);

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      if (selection) dismiss();
      return;
    }

    const selectedText = sel.toString().trim();
    if (selectedText.length < 2) return;

    if (containerRef.current && !containerRef.current.contains(sel.anchorNode)) {
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wordCount = selectedText.split(/\s+/).length;
      
      setSelection({ text: selectedText, rect, isPhrase: wordCount > 1 });
      setShowTranslation(false);
      setTranslation('');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('magic-popup-open'));
        window.dispatchEvent(new CustomEvent('word-popup-close', { detail: { sourceId: 'magic-wrapper' } }));
      }
    } catch {
      setSelection(null);
    }
  }, [selection]);

  const dismiss = useCallback(() => {
    window.speechSynthesis?.cancel();
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowTranslation(false);
    setTranslation('');
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (selection && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };

    const handleScrollOrResize = () => {
      if (selection) dismiss();
    };

    const handleWordPopupOpen = () => {
      if (selection) dismiss();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('word-popup-open', handleWordPopupOpen);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('word-popup-open', handleWordPopupOpen);
    };
  }, [selection, dismiss]);

  const fetchTranslation = async () => {
    if (!selection || translation || isTranslating) return;
    setIsTranslating(true);
    
    try {
      const targetLang = await getNativeLang();
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection.text, targetLang }),
      });
      const data = await res.json();
      setTranslation(data.translated || '—');
      setShowTranslation(true);
    } catch {
      setTranslation('—');
      setShowTranslation(true);
    } finally {
      setIsTranslating(false);
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
    if (!selection || isSaving) return;
    setIsSaving(true);
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

      dismiss();
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const popupH = showTranslation && translation ? 120 : 58;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const currentPopupW = isDesktop ? Math.min(POPUP_W_DESKTOP, 320) : POPUP_W;
  const popupStyle = selection?.rect ? calcPopupStyle(selection.rect, popupH, currentPopupW) : {};

  return (
    <div 
      ref={containerRef} 
      className="relative inline-block w-full"
      onMouseUp={handleSelection}
      onTouchEnd={() => setTimeout(handleSelection, 50)} 
    >
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
              width: currentPopupW,
              maxWidth: '320px',
              ...popupStyle,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="overflow-hidden rounded-2xl backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
              style={{
                background: popupBg,
                border: `1px solid ${popupBorder}`,
                width: '100%',
              }}
            >
              <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b"
                style={{ borderColor: dividerColor }}>
                <span className="text-xs font-bold flex-1 break-words line-clamp-2" style={{ color: textPrimary, wordBreak: 'break-word' }}>
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

              <div className="flex items-stretch divide-x" style={{ borderColor: dividerColor }}>
                <button
                  onClick={fetchTranslation}
                  disabled={showTranslation || isTranslating}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 transition-all disabled:opacity-50 min-w-0 hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: textMuted }}
                >
                  {isTranslating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                  )}
                  <span className="text-[9px] font-bold leading-none">{isTranslating ? 'Wait...' : showTranslation ? 'Done' : 'Translate'}</span>
                </button>

                <button
                  onClick={speak}
                  disabled={isSpeaking}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: isSpeaking ? accentColor : textMuted }}
                >
                  <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  <span className="text-[9px] font-bold leading-none">{isSpeaking ? 'Playing' : 'Listen'}</span>
                </button>

                <button
                  onClick={saveToDeck}
                  disabled={isSaving}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 transition-all disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: accentColor }}
                >
                  {isSaving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    : <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                  <span className="text-[9px] font-bold leading-none">{isSaving ? 'Saving' : 'Add Card'}</span>
                </button>

                <button
                  onClick={dismiss}
                  className="px-3 py-2.5 flex items-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
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