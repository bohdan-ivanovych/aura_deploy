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
type PopupPlacement = 'right' | 'left' | 'below' | 'above';

interface PopupPos {
  top: number;
  left: number;
  placement: PopupPlacement;
  anchorX: number;
  anchorY: number;
}

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

// ─── Layout constants ─────────────────────────────────────────────────────────
const POPUP_W = 380;
const POPUP_H_EST = 215; // rough height estimate for placement math
const GAP = 10;  // gap between bubble edge and popup
const MARGIN = 12;  // min distance from viewport edge
const BOTTOM_RESERVE = 120; // reserve space for ChatInput on desktop

export default function ClickableWordText({
  text, voiceId, fullMessageText, magicHintWordIndices,
}: ClickableWordTextProps) {
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
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null);
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

  // ─── Translation / explanation fetch ────────────────────────────────────────
  useEffect(() => {
    if (!hasSelection || !selectedText) {
      setTranslation(null); setExplanation(null); setPopupPos(null); return;
    }
    if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    setTranslation(null); setExplanation(null); setIsTranslating(true);

    translateTimeoutRef.current = setTimeout(async () => {
      try {
        const { nativeLang, explanationLang } = await getSettings();
        if (showTranslation) {
          if (translationCache.has(selectedText)) {
            setTranslation(translationCache.get(selectedText)!);
          } else {
            const res = await fetch('/api/translate', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: selectedText, targetLang: nativeLang }),
            });
            const data = await res.json();
            const t = data.translated || '';
            translationCache.set(selectedText, t);
            setTranslation(t);
          }
        }
        if (showExplanation && !isPhrase) {
          const key = `${selectedText}|||${explanationLang}`;
          if (explanationCache.has(key)) {
            setExplanation(explanationCache.get(key)!);
          } else {
            const res = await fetch('/api/word-details', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ word: selectedText, contextSentence: fullMessageText }),
            });
            const data = await res.json();
            const e = data.explanation || '';
            explanationCache.set(key, e);
            setExplanation(e);
          }
        }
      } catch { /* silent */ } finally { setIsTranslating(false); }
    }, 300);

    return () => { if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current); };
  }, [selectedText, hasSelection, showTranslation, showExplanation, isPhrase, fullMessageText]);

  // ─── Mobile event bridge ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasSelection && window.innerWidth < 768) {
      window.dispatchEvent(new CustomEvent('word-popup-open', {
        detail: { sourceId: myId, word: selectedText, translation, explanation, isTranslating, isPhrase, contextSentence: fullMessageText, voiceId: voiceId ?? null },
      }));
    } else if (!hasSelection) {
      window.dispatchEvent(new CustomEvent('word-popup-close', { detail: { sourceId: myId } }));
    }
  }, [hasSelection, selectedText, translation, explanation, isTranslating, isPhrase, fullMessageText, voiceId, myId]);

  // ─── Cross-component clear ───────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: CustomEvent) => {
      if (e.type === 'magic-popup-open' || e.detail?.sourceId !== myId) {
        setSelectedIndices(new Set());
        setTranslation(null); setExplanation(null); setIsPlayingAudio(false);
      }
    };
    window.addEventListener('word-popup-open', handle as EventListener);
    window.addEventListener('word-popup-close', handle as EventListener);
    window.addEventListener('magic-popup-open', handle as EventListener);
    return () => {
      window.removeEventListener('word-popup-open', handle as EventListener);
      window.removeEventListener('word-popup-close', handle as EventListener);
      window.removeEventListener('magic-popup-open', handle as EventListener);
    };
  }, [myId]);

  // ─── Outside click ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasSelection) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.word-token') || t.closest('.mobile-word-tray') || t.closest('.word-popup-desktop')) return;
      window.dispatchEvent(new CustomEvent('word-popup-close', { detail: { sourceId: 'global' } }));
    };
    document.addEventListener('pointerdown', handle, { capture: true });
    return () => document.removeEventListener('pointerdown', handle, { capture: true });
  }, [hasSelection]);

  // ─── Smart positioning ───────────────────────────────────────────────────────
  // Priority: right-of-bubble → left-of-bubble → below-bubble → above-word
  const updatePosition = useCallback(() => {
    if (!hasSelection || !containerRef.current) return;
    const els = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.word-token[data-selected="true"]'),
    );
    if (els.length === 0) return;

    const wordRect = els[0].getBoundingClientRect();
    const bubbleRect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const isDesktop = vw >= 768;
    const bottomLimit = isDesktop ? vh - BOTTOM_RESERVE : vh;

    const spaceRight = vw - bubbleRect.right - MARGIN;
    const spaceLeft = bubbleRect.left - MARGIN;
    const spaceBelow = bottomLimit - bubbleRect.bottom - MARGIN;
    const spaceAbove = wordRect.top - MARGIN;

    let placement: PopupPlacement;
    let top = 0, left = 0;

    if (spaceRight >= POPUP_W + GAP) {
      placement = 'right';
      left = bubbleRect.right + GAP;
      top = Math.max(MARGIN, Math.min(wordRect.top - 8, bottomLimit - POPUP_H_EST - MARGIN));

    } else if (spaceLeft >= POPUP_W + GAP) {
      placement = 'left';
      left = bubbleRect.left - POPUP_W - GAP;
      top = Math.max(MARGIN, Math.min(wordRect.top - 8, bottomLimit - POPUP_H_EST - MARGIN));

    } else if (spaceBelow >= POPUP_H_EST + GAP) {
      placement = 'below';
      top = bubbleRect.bottom + GAP;
      left = Math.max(MARGIN, Math.min(wordRect.left - 10, vw - POPUP_W - MARGIN));

    } else {
      placement = 'above';
      top = wordRect.top - GAP;
      left = Math.max(MARGIN, Math.min(wordRect.left - 10, vw - POPUP_W - MARGIN));
    }

    setPopupPos({ top, left, placement, anchorX: wordRect.left, anchorY: wordRect.top });
  }, [hasSelection]);

  useEffect(() => {
    updatePosition();
    let ticking = false;
    const onEvent = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { updatePosition(); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('resize', onEvent);
    window.addEventListener('scroll', onEvent, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', onEvent);
      window.removeEventListener('scroll', onEvent, { capture: true });
    };
  }, [updatePosition]);

  // ─── Interaction handlers ────────────────────────────────────────────────────
  const handleWordClick = useCallback((e: React.MouseEvent, idx: number, isMagicHint?: boolean) => {
    if (isMagicHint && magicHintActive) {
      try { localStorage.setItem('magic_hint_shown', 'true'); } catch { }
      setMagicHintActive(false);
    }
    window.dispatchEvent(new CustomEvent('word-popup-open', { detail: { sourceId: myId } }));
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, [magicHintActive, myId]);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
    setTranslation(null); setExplanation(null); setIsTranslating(false);
    try { window.getSelection()?.removeAllRanges(); } catch { }
    setIsPlayingAudio(false);
    window.speechSynthesis?.cancel();
    window.dispatchEvent(new CustomEvent('word-popup-close'));
  }, []);

  const playAudio = async () => {
    if (!selectedText) return;
    if (!('speechSynthesis' in window)) { toast.error('Voice not supported'); return; }
    setIsPlayingAudio(true);
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(selectedText);
    utt.lang = 'en-US';
    utt.onend = () => setIsPlayingAudio(false);
    utt.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utt);
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
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: selectedText, targetLang: nativeLang }),
          });
          back = (await r.json()).translated || '';
        } catch { /* ignore */ }
      }
      const res = await fetch('/api/create-flashcard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: selectedText, back, type: 'translation', contextSentence: fullMessageText, englishExplanation: explanation || null }),
      });
      if (!res.ok) {
        const e = await res.json();
        if (e.error === 'Word already in your deck') {
          toast.info('Already in your deck', { description: `"${selectedText}" is saved.` });
          clearSelection(); return;
        }
        throw new Error(e.error || 'Failed');
      }
      toast.success(isPhrase ? '📖 Phrase saved!' : '✨ Word saved!', { description: `"${selectedText}" added to your deck.` });
      setSelectedIndices(new Set()); setTranslation(null); setExplanation(null);
      try { window.getSelection()?.removeAllRanges(); } catch { }
      window.dispatchEvent(new CustomEvent('word-popup-close'));
    } catch (err) {
      toast.error('Sync failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    } finally { setIsSaving(false); }
  };

  // ─── Theme tokens ────────────────────────────────────────────────────────────
  const popupBg = isDark ? 'rgba(10,12,22,0.97)' : 'rgba(255,255,255,0.98)';
  const popupBorder = isDark ? 'rgba(0,212,212,0.22)' : 'rgba(8,145,178,0.20)';
  const textColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const accentColor = isDark ? '#00d4d4' : '#0891b2';
  const hoverCls = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';

  // ─── Placement helpers ───────────────────────────────────────────────────────
  const getTransform = (p: PopupPlacement) => (p === 'above' ? 'translateY(-100%)' : 'none');

  const getMotionInitial = (p: PopupPlacement) => {
    if (p === 'right') return { opacity: 0, x: -10, scale: 0.95 };
    if (p === 'left') return { opacity: 0, x: 10, scale: 0.95 };
    if (p === 'below') return { opacity: 0, y: -8, scale: 0.96 };
    return { opacity: 0, y: 8, scale: 0.96 };
  };

  // Arrow connecting popup to message bubble
  const Arrow = ({ p }: { p: PopupPlacement }) => {
    const base: React.CSSProperties = {
      position: 'absolute', width: 10, height: 10,
      background: popupBg, transform: 'rotate(45deg)',
    };
    if (p === 'right') return <div style={{ ...base, left: -6, top: 20, borderLeft: `1px solid ${popupBorder}`, borderBottom: `1px solid ${popupBorder}` }} />;
    if (p === 'left') return <div style={{ ...base, right: -6, top: 20, borderRight: `1px solid ${popupBorder}`, borderTop: `1px solid ${popupBorder}` }} />;
    if (p === 'below') return <div style={{ ...base, top: -6, left: 20, borderLeft: `1px solid ${popupBorder}`, borderTop: `1px solid ${popupBorder}` }} />;
    return <div style={{ ...base, bottom: -6, left: 20, borderRight: `1px solid ${popupBorder}`, borderBottom: `1px solid ${popupBorder}` }} />;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
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
              className={`word-token cursor-pointer rounded-[3px] px-[1px] transition-all duration-100 ${isSelected
                ? isDark ? 'text-cyan-200' : 'text-cyan-700'
                : isDark ? 'hover:bg-white/10 active:bg-white/15' : 'hover:bg-black/10 active:bg-black/15'
                }`}
              style={
                isSelected ? {
                  background: isDark ? 'rgba(0,212,212,0.22)' : 'rgba(8,145,178,0.14)',
                  boxShadow: `0 0 0 1px ${isDark ? 'rgba(0,212,212,0.4)' : 'rgba(8,145,178,0.35)'}`,
                } : isMagicHint ? {
                  background: 'linear-gradient(90deg, rgba(45,156,219,0.35), rgba(155,81,224,0.35))',
                  borderRadius: '3px',
                } : {}
              }
            >
              {token.value}
            </span>
          );
        })}
      </p>

      {/* ── Desktop popup rendered in document.body portal ── */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {hasSelection && popupPos && (
            <motion.div
              key="word-popup-desktop"
              className="word-popup-desktop hidden md:block fixed z-[99999] pointer-events-auto"
              style={{
                width: POPUP_W,
                top: popupPos.top,
                left: popupPos.left,
                transform: getTransform(popupPos.placement),
              }}
              initial={getMotionInitial(popupPos.placement)}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            >
              <div
                className="rounded-2xl overflow-visible backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.28)] relative"
                style={{ background: popupBg, border: `1px solid ${popupBorder}` }}
              >
                {/* Directional arrow */}
                <Arrow p={popupPos.placement} />

                {/* Header */}
                <div className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-2 border-b" style={{ borderColor: divider }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold truncate max-w-[220px]" style={{ color: textColor }}>
                      "{selectedText}"
                    </span>
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.2em] shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isPhrase ? 'rgba(224,64,251,0.18)' : `${accentColor}20`,
                        color: isPhrase ? '#e040fb' : accentColor,
                        border: `1px solid ${isPhrase ? 'rgba(224,64,251,0.3)' : `${accentColor}40`}`,
                      }}
                    >
                      {isPhrase ? 'Phrase' : 'Word'}
                    </span>
                  </div>
                  <button onClick={clearSelection} className="shrink-0 transition-colors" style={{ color: mutedColor }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Translation */}
                {showTranslation && (
                  <div className="px-3 py-2 border-b" style={{ borderColor: divider, minHeight: 38 }}>
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

                {/* Usage */}
                {showExplanation && !isPhrase && (
                  <div className="px-3 py-2 border-b" style={{ borderColor: divider, minHeight: 38 }}>
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: mutedColor }}>Usage</p>
                    {isTranslating ? (
                      <div className="space-y-1.5">
                        {[1, 0.72, 0.5].map((w, i) => (
                          <div key={i} className="h-2.5 rounded animate-pulse"
                            style={{ width: `${w * 100}%`, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] leading-relaxed italic" style={{ color: mutedColor }}>
                        {explanation || '—'}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center">
                  <button
                    onClick={playAudio}
                    disabled={isPlayingAudio}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all flex-1 disabled:opacity-50 ${hoverCls}`}
                    style={{ color: mutedColor }}
                  >
                    {isPlayingAudio
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: accentColor }} />
                      : <Volume2 className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                    Play
                  </button>
                  <div className="h-8 w-px shrink-0" style={{ background: divider }} />
                  <button
                    onClick={saveFlashcard}
                    disabled={isSaving}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all flex-1 disabled:opacity-50 ${hoverCls}`}
                    style={{ color: accentColor }}
                  >
                    {isSaving
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      : <BookOpen className="w-3.5 h-3.5 shrink-0" />}
                    {isSaving ? 'Saving…' : 'Add Card'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}