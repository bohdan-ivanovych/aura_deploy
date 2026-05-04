'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Volume2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/lib/contexts/theme-context';
import { createPortal } from 'react-dom';

interface ClickableWordTextProps {
  text: string;
  voiceId?: string | null;
  fullMessageText: string;
  magicHintWordIndices?: number[];
}

type Token = { type: 'word' | 'space'; value: string };
type CardPreference = 'translation' | 'explanation' | 'both';

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (!part) continue;
    tokens.push({ type: /^\s+$/.test(part) ? 'space' : 'word', value: part });
  }
  return tokens;
}

const LANG_CODE_TO_NAME: Record<string, string> = {
  uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
  de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
  tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
};

// Module-level caches
let cachedNativeLang: string | null = null;
let cachedCardPref: CardPreference | null = null;
let cachedExplanationLang: string | null = null;

async function getSettings(): Promise<{ nativeLang: string; cardPref: CardPreference; explanationLang: string }> {
  if (cachedNativeLang && cachedCardPref && cachedExplanationLang) {
    return { nativeLang: cachedNativeLang, cardPref: cachedCardPref, explanationLang: cachedExplanationLang };
  }
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const code = data?.user?.nativeLanguage || 'uk';
    cachedNativeLang = LANG_CODE_TO_NAME[code] || 'Ukrainian';
    cachedCardPref = (data?.user?.cardPreference as CardPreference) || 'both';
    cachedExplanationLang = data?.user?.explanationLanguage || 'english';
  } catch {
    cachedNativeLang = 'Ukrainian';
    cachedCardPref = 'both';
    cachedExplanationLang = 'english';
  }
  return { nativeLang: cachedNativeLang!, cardPref: cachedCardPref!, explanationLang: cachedExplanationLang! };
}

const translationCache = new Map<string, string>();
const explanationCache = new Map<string, string>();

export default function ClickableWordText({ text, voiceId, fullMessageText, magicHintWordIndices }: ClickableWordTextProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const myId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [magicHintActive, setMagicHintActive] = useState<boolean>(() => {
    if (!magicHintWordIndices?.length) return false;
    try { return localStorage.getItem('magic_hint_shown') !== 'true'; } catch { return false; }
  });
  
  const magicHintSet = useMemo(() => new Set(magicHintWordIndices ?? []), [magicHintWordIndices]);
  
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [cardPref, setCardPref] = useState<CardPreference>('both');
  
  const translateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tokens = tokenize(text);

  const selectedText = tokens
    .map((t, i) => (t.type === 'word' && selectedIndices.has(i) ? t.value : null))
    .filter(Boolean)
    .join(' ')
    .replace(/^[.,!?;:'"»«\-]+|[.,!?;:'"»«\-]+$/g, '');

  const hasSelection = selectedIndices.size > 0;
  const isPhrase = selectedIndices.size > 1;

  const showTranslation = cardPref === 'translation' || cardPref === 'both';
  const showExplanation = cardPref === 'explanation' || cardPref === 'both';

  useEffect(() => {
    getSettings().then(({ cardPref: pref }) => setCardPref(pref));
  }, []);

  useEffect(() => {
    if (!hasSelection || !selectedText) {
      setTranslation(null);
      setExplanation(null);
      setPopupPos(null);
      return;
    }

    if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    setTranslation(null);
    setExplanation(null);
    setIsTranslating(true);

    translateTimeoutRef.current = setTimeout(async () => {
      try {
        const { nativeLang, explanationLang } = await getSettings();

        if (showTranslation) {
          if (translationCache.has(selectedText)) {
            setTranslation(translationCache.get(selectedText)!);
          } else {
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: selectedText, targetLang: nativeLang }),
            });
            const data = await res.json();
            const t = data.translated || '';
            translationCache.set(selectedText, t);
            setTranslation(t);
          }
        }

        if (showExplanation && !isPhrase) {
          const explCacheKey = `${selectedText}|||${explanationLang}`;
          if (explanationCache.has(explCacheKey)) {
            setExplanation(explanationCache.get(explCacheKey)!);
          } else {
            const res = await fetch('/api/word-details', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ word: selectedText, contextSentence: fullMessageText }),
            });
            const data = await res.json();
            const e = data.explanation || '';
            explanationCache.set(explCacheKey, e);
            setExplanation(e);
          }
        }
      } catch {
        // Silently ignore
      } finally {
        setIsTranslating(false);
      }
    }, 300);

    return () => {
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    };
  }, [selectedText, hasSelection, showTranslation, showExplanation, isPhrase, fullMessageText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (hasSelection && window.innerWidth < 768) {
      window.dispatchEvent(new CustomEvent('word-popup-open', {
        detail: {
          sourceId: myId,
          word: selectedText,
          translation,
          explanation,
          isTranslating,
          isPhrase,
          contextSentence: fullMessageText,
          voiceId: voiceId ?? null,
        },
      }));
    } else if (!hasSelection) {
      window.dispatchEvent(new CustomEvent('word-popup-close', { detail: { sourceId: myId } }));
    }
  }, [hasSelection, selectedText, translation, explanation, isTranslating, isPhrase, fullMessageText, voiceId, myId]);

  // Handle cross-component clearing
  useEffect(() => {
    const handleRemoteEvent = (e: CustomEvent) => {
      if (e.type === 'magic-popup-open' || e.detail?.sourceId !== myId) {
        setSelectedIndices(new Set());
        setTranslation(null);
        setExplanation(null);
        setIsPlayingAudio(false);
      }
    };
    
    window.addEventListener('word-popup-open', handleRemoteEvent as EventListener);
    window.addEventListener('word-popup-close', handleRemoteEvent as EventListener);
    window.addEventListener('magic-popup-open', handleRemoteEvent as EventListener);
    return () => {
      window.removeEventListener('word-popup-open', handleRemoteEvent as EventListener);
      window.removeEventListener('word-popup-close', handleRemoteEvent as EventListener);
      window.removeEventListener('magic-popup-open', handleRemoteEvent as EventListener);
    };
  }, [myId]);

  useEffect(() => {
    if (!hasSelection) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.word-token') || target.closest('.mobile-word-tray')) return;
      window.dispatchEvent(new CustomEvent('word-popup-close', { detail: { sourceId: 'global' } }));
    };
    document.addEventListener('pointerdown', handleOutsideClick, { capture: true });
    return () => document.removeEventListener('pointerdown', handleOutsideClick, { capture: true });
  }, [hasSelection]);

  const updatePosition = useCallback(() => {
    if (!hasSelection || !containerRef.current) return;
    const selectedEls = Array.from(containerRef.current.querySelectorAll('.word-token[data-selected="true"]'));
    if (selectedEls.length === 0) return;
    
    const firstRect = selectedEls[0].getBoundingClientRect();
    const firstLineEls = selectedEls.filter(el => Math.abs(el.getBoundingClientRect().top - firstRect.top) < 10);
    const lastInFirstLine = firstLineEls[firstLineEls.length - 1].getBoundingClientRect();
    
    let left = firstRect.left;
    const maxLeft = window.innerWidth - 290;
    
    if (left > maxLeft) left = maxLeft;
    if (left < 10) left = 10;
    
    setPopupPos({
      top: firstRect.top,
      left: left,
      width: lastInFirstLine.right - firstRect.left
    });
  }, [hasSelection]);

  useEffect(() => {
    updatePosition();
    let ticking = false;
    
    const handleScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updatePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [updatePosition]);

  const handleWordClick = useCallback((e: React.MouseEvent, idx: number, isMagicHint?: boolean) => {
    if (isMagicHint && magicHintActive) {
      try { localStorage.setItem('magic_hint_shown', 'true'); } catch {}
      setMagicHintActive(false);
    }
    // Also trigger close for magic popup if we click a word
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('word-popup-open', { detail: { sourceId: myId } }));

    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [magicHintActive, myId]);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
    setTranslation(null);
    setExplanation(null);
    setIsTranslating(false);
    try { window.getSelection()?.removeAllRanges(); } catch {}
    setIsPlayingAudio(false);
    window.speechSynthesis?.cancel();
    window.dispatchEvent(new CustomEvent('word-popup-close'));
  }, []);

  const playAudio = async () => {
    if (!selectedText) return;

    if (!('speechSynthesis' in window)) {
      toast.error('Voice not supported in this browser');
      return;
    }

    setIsPlayingAudio(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = 'en-US';
    
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const saveFlashcard = async () => {
    if (!selectedText || isSaving) return;
    setIsSaving(true);
    try {
      const { nativeLang } = await getSettings();
      let back = translation || '';
      
      if (!back) {
        try {
          const r = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: selectedText, targetLang: nativeLang }),
          });
          const d = await r.json();
          back = d.translated || '';
        } catch { /* ignore */ }
      }
      
      const res = await fetch('/api/create-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: selectedText,
          back,
          type: 'translation',
          contextSentence: fullMessageText,
          englishExplanation: explanation || null,
        }),
      });
      
      if (!res.ok) {
        const e = await res.json();
        if (e.error === 'Word already in your deck') {
          toast.info('Already in your deck', { description: `"${selectedText}" is saved.` });
          clearSelection();
          return;
        }
        throw new Error(e.error || 'Failed');
      }
      
      toast.success(isPhrase ? '📖 Phrase saved!' : '✨ Word saved!', {
        description: `"${selectedText}" added to your deck.`,
      });
      
      setSelectedIndices(new Set());
      setTranslation(null);
      setExplanation(null);
      try { window.getSelection()?.removeAllRanges(); } catch {}
      window.dispatchEvent(new CustomEvent('word-popup-close'));
    } catch (err) {
      toast.error('Sync failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsSaving(false);
    }
  };

  const popupBg = isDark ? 'rgba(10,12,22,0.97)' : 'rgba(255,255,255,0.97)';
  const popupBorder = isDark ? 'rgba(0,212,212,0.28)' : 'rgba(8,145,178,0.25)';
  const textColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const actionHoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';
  const accentColor = isDark ? '#00d4d4' : '#0891b2';

  return (
    <div className="relative" ref={containerRef}>
      <p className="text-[14px] leading-[1.8] font-medium text-[var(--foreground)] tracking-[0.005em] select-none whitespace-pre-wrap after:content-[''] after:inline-block after:w-[46px] after:h-2">
        {tokens.map((token, idx) => {
          if (token.type === 'space') return <span key={idx}>{token.value}</span>;
          const isSelected = selectedIndices.has(idx);
          const isMagicHint = magicHintActive && magicHintSet.has(idx);
          return (
            <span
              key={idx}
              onClick={(e) => handleWordClick(e, idx, isMagicHint)}
              data-selected={isSelected}
              className={`word-token cursor-pointer rounded-[3px] px-[1px] transition-all duration-100 ${
                isSelected
                  ? isDark ? 'text-cyan-200' : 'text-cyan-700'
                  : isDark ? 'hover:bg-white/10 active:bg-white/15' : 'hover:bg-black/10 active:bg-black/15'
              }`}
              style={isSelected ? {
                background: isDark ? 'rgba(0,212,212,0.22)' : 'rgba(8,145,178,0.14)',
                boxShadow: `0 0 0 1px ${isDark ? 'rgba(0,212,212,0.4)' : 'rgba(8,145,178,0.35)'}`,
              } : isMagicHint ? {
                background: 'linear-gradient(90deg, rgba(45,156,219,0.35), rgba(155,81,224,0.35))',
                borderRadius: '3px',
              } : {}}
            >
              {token.value}
            </span>
          );
        })}
      </p>

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {hasSelection && popupPos && (
            <motion.div
              key="word-popup-desktop"
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 440, damping: 30 }}
              className="hidden md:block fixed z-[99999] pointer-events-auto"
              style={{ minWidth: '280px', top: popupPos.top - 10, left: popupPos.left, transform: 'translateY(-100%)' }}
            >
              <div
                className="rounded-2xl overflow-hidden backdrop-blur-2xl bg-black/30 shadow-[0_8px_40px_rgba(0,0,0,0.3)] relative z-[9999]"
                style={{ background: popupBg, border: `1px solid ${popupBorder}`, maxWidth: '320px', width: '100%' }}
              >
                <div className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-2 border-b"
                  style={{ borderColor: dividerColor }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold truncate max-w-[150px]" style={{ color: textColor }}>
                      "{selectedText}"
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isPhrase ? 'rgba(224,64,251,0.18)' : `${accentColor}20`,
                        color: isPhrase ? '#e040fb' : accentColor,
                        border: `1px solid ${isPhrase ? 'rgba(224,64,251,0.3)' : `${accentColor}40`}`,
                      }}>
                      {isPhrase ? 'Phrase' : 'Word'}
                    </span>
                  </div>
                  <button onClick={clearSelection} className="shrink-0 transition-colors" style={{ color: mutedColor }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showTranslation && (
                  <div className="px-3 py-2 border-b" style={{ borderColor: dividerColor, minHeight: '32px' }}>
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: mutedColor }}>Translation</p>
                    {isTranslating ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: `${accentColor}99` }} />
                        <span className="text-[11px] italic" style={{ color: mutedColor }}>Translating…</span>
                      </div>
                    ) : (
                      <p className="text-[12px] font-medium" style={{ color: isDark ? 'rgba(180,220,255,0.85)' : '#0891b2' }}>
                        {translation || <span style={{ color: mutedColor }}>—</span>}
                      </p>
                    )}
                  </div>
                )}

                {showExplanation && !isPhrase && (
                  <div className="px-3 py-2 border-b" style={{ borderColor: dividerColor, minHeight: '32px' }}>
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: mutedColor }}>Usage</p>
                    {isTranslating ? (
                      <div className="w-full h-3 rounded animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }} />
                    ) : (
                      <p className="text-[11px] leading-relaxed italic" style={{ color: mutedColor }}>
                        {explanation || '—'}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center">
                  <button
                    onClick={playAudio}
                    disabled={isPlayingAudio}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all flex-1 disabled:opacity-50 ${actionHoverBg}`}
                    style={{ color: mutedColor }}
                  >
                    {isPlayingAudio
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: accentColor }} />
                      : <Volume2 className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                    Play
                  </button>
                  <div className="h-8 w-px shrink-0" style={{ background: dividerColor }} />
                  <button
                    onClick={saveFlashcard}
                    disabled={isSaving}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all flex-1 disabled:opacity-50 ${actionHoverBg}`}
                    style={{ color: accentColor }}
                  >
                    {isSaving
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      : <BookOpen className="w-3.5 h-3.5 shrink-0" />}
                    {isSaving ? 'Saving…' : 'Add Card'}
                  </button>
                </div>
              </div>
              <div className="absolute left-5 -bottom-[5px] w-2.5 h-2.5 rotate-45"
                style={{
                  background: popupBg,
                  borderRight: `1px solid ${popupBorder}`,
                  borderBottom: `1px solid ${popupBorder}`,
                }} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}