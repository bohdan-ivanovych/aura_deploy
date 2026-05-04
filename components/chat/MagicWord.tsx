'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from '@/lib/contexts/theme-context';

interface MagicWordProps {
  word: string;
  contextSentence?: string;
}

type CardPreference = 'translation' | 'explanation' | 'both';

const spring = { type: 'spring' as const, stiffness: 400, damping: 25 };

const LANG_CODE_TO_NAME: Record<string, string> = {
  uk: 'Ukrainian', en: 'English', es: 'Spanish', pl: 'Polish',
  de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese',
  tr: 'Turkish', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
};

let cachedSettings: { nativeLang: string; cardPref: CardPreference } | null = null;
async function getSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const code = data?.user?.nativeLanguage || 'uk';
    cachedSettings = {
      nativeLang: LANG_CODE_TO_NAME[code] || 'Ukrainian',
      cardPref: (data?.user?.cardPreference as CardPreference) || 'both',
    };
  } catch {
    cachedSettings = { nativeLang: 'Ukrainian', cardPref: 'both' };
  }
  return cachedSettings!;
}

export function MagicWord({ word, contextSentence = '' }: MagicWordProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState('');
  const [englishExplanation, setEnglishExplanation] = useState('');
  const [cardPref, setCardPref] = useState<CardPreference>('both');

  const showTranslation = cardPref === 'translation' || cardPref === 'both';
  const showExplanation = cardPref === 'explanation' || cardPref === 'both';

  useEffect(() => {
    getSettings().then(({ cardPref: pref }) => setCardPref(pref));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setSaving(false);
      setError(null);
      setTranslation('');
      setEnglishExplanation('');
    }
  }, [isOpen]);

  const loadDetails = async () => {
    if (word.length < 2) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/word-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, contextSentence }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch word details');
      }

      const data = await res.json();
      setTranslation(data.translation || '');
      setEnglishExplanation(data.explanation || '');
    } catch (err) {
      console.error('Failed to generate card details', err);
      setError("Couldn't retrieve details — try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlashcard = async () => {
    setSaving(true);
    try {
      const { cardPref: pref } = await getSettings();
      // Determine what to save based on preference
      const backContent = pref === 'explanation'
        ? englishExplanation
        : pref === 'both'
          ? [translation, englishExplanation].filter(Boolean).join('\n\n')
          : translation;

      const res = await fetch('/api/create-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: word,
          back: backContent || translation,
          type: 'translation',
          contextSentence,
          englishExplanation: englishExplanation || null,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setIsOpen(false);
        toast.success('Added to your deck', {
          description: `"${word}" saved successfully.`,
          className:
            'bg-[var(--surface)] backdrop-blur-3xl border-[var(--border)] shadow-2xl text-[var(--foreground)]',
        });
      } else if (result?.error === 'Word already in your deck') {
        toast.info('Already in your deck', {
          description: `"${word}" is already saved.`,
          className:
            'bg-[var(--surface)] backdrop-blur-3xl border-[var(--border)] shadow-2xl text-[var(--foreground)]',
        });
      } else {
        throw new Error(result?.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save flashcard', err);
      toast.error('Failed to save word.');
    } finally {
      setSaving(false);
    }
  };

  // Theme colors
  const popupBg = isDark ? 'var(--surface)' : 'rgba(255,255,255,0.97)';
  const accentColor = isDark ? '#00d4d4' : '#0891b2';
  const mutedColor = 'var(--foreground-muted)';

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open && !translation && !englishExplanation) {
          void loadDetails();
        }
      }}
    >
      <PopoverTrigger asChild>
        <motion.span
          className="relative cursor-pointer inline-block group"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          transition={spring}
        >
          <span
            className="relative z-10 px-1 rounded-md transition-colors duration-300"
            style={{
              color: isDark ? 'rgba(34,211,238,0.85)' : '#0891b2',
            }}
          >
            {word}
          </span>
          <motion.span
            className="absolute bottom-0 left-0 w-full h-[2px] rounded-full"
            style={{ background: `${accentColor}50` }}
            layoutId={`underline-${word}`}
          />
        </motion.span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        avoidCollisions
        collisionPadding={12}
        className="w-72 sm:w-80 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.6)] rounded-3xl p-5 overflow-hidden ring-1 z-[9999]"
        style={{
          background: popupBg,
          border: `1px solid ${isDark ? 'var(--border)' : 'rgba(0,0,0,0.08)'}`,
          '--tw-ring-color': isDark ? 'var(--border)' : 'rgba(0,0,0,0.06)',
        } as React.CSSProperties}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${accentColor}08, rgba(168,85,247,0.05))` }}
        />

        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: mutedColor }}>
                Word
              </p>
              <h3 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                {word}
              </h3>
            </div>
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-8 h-8 rounded-full border-2 animate-spin"
                  style={{ borderColor: `${accentColor}20`, borderTopColor: accentColor }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Translation */}
          {showTranslation && (
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-right" style={{ color: mutedColor }}>
                Translation
              </p>
              <div className="min-h-[24px] flex justify-end">
                {loading ? (
                  <div className="w-2/3 h-5 rounded-lg animate-pulse" style={{ background: 'var(--surface-hover)' }} />
                ) : (
                  <p className="text-sm font-medium text-right" style={{ color: isDark ? 'rgba(180,220,255,0.9)' : '#0891b2' }}>
                    {translation || (
                      <span className="italic" style={{ color: mutedColor }}>—</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Explanation */}
          {showExplanation && (
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: mutedColor }}>
                Usage
              </p>
              <div className="min-h-[48px]">
                {loading ? (
                  <div className="space-y-2">
                    <div className="w-full h-4 rounded-lg animate-pulse" style={{ background: 'var(--surface-hover)' }} />
                    <div className="w-4/5 h-4 rounded-lg animate-pulse" style={{ background: 'var(--surface-hover)' }} />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed italic" style={{ color: mutedColor }}>
                    {englishExplanation || (
                      <span>—</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-[11px] font-medium bg-red-400/5 p-2 rounded-xl border border-red-400/10 text-center"
              style={{ color: 'rgba(248,113,113,0.8)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <motion.button
              type="button"
              onClick={() => setIsOpen(false)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
              style={{ color: mutedColor, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
            >
              Dismiss
            </motion.button>
            <motion.button
              type="button"
              onClick={handleAddFlashcard}
              disabled={saving || loading || (!translation && !englishExplanation)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="flex-[1.5] px-4 py-2.5 rounded-2xl text-xs font-bold disabled:opacity-40 transition-all text-white"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${isDark ? '#0098db' : '#0064c8'})` }}
            >
              {saving ? 'Saving…' : 'Save to Deck'}
            </motion.button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
