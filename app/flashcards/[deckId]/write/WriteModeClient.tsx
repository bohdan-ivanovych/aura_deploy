'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { ArrowLeft, Check, X, Zap, Trophy, Star } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/lib/contexts/theme-context';
import { binaryReviewFlashcard } from '@/app/actions/flashcard';
import { toast } from 'sonner';

// Language-native placeholder hints
const PLACEHOLDER_MAP: Record<string, string> = {
  uk: 'Введіть переклад...',
  ru: 'Введите перевод...',
  pl: 'Wpisz tłumaczenie...',
  de: 'Übersetzung eingeben...',
  fr: 'Saisissez la traduction...',
  es: 'Escribe la traducción...',
  it: 'Inserisci la traduzione...',
  pt: 'Digite a tradução...',
  tr: 'Çeviriyi yazın...',
  ja: '翻訳を入力...',
  zh: '输入翻译...',
  ar: 'أدخل الترجمة...',
  ko: '번역을 입력하세요...',
  nl: 'Typ de vertaling...',
  sv: 'Skriv översättningen...',
  no: 'Skriv oversettelsen...',
  da: 'Skriv oversættelsen...',
  fi: 'Kirjoita käännös...',
  el: 'Γράψτε τη μετάφραση...',
  cs: 'Napište překlad...',
  ro: 'Introduceți traducerea...',
  hu: 'Írja be a fordítást...',
};

function getPlaceholder(nativeLanguage: string | null | undefined): string {
  if (!nativeLanguage) return 'Type the translation...';
  const code = nativeLanguage.toLowerCase().trim().substring(0, 2);
  return PLACEHOLDER_MAP[code] ?? PLACEHOLDER_MAP[nativeLanguage] ?? 'Type the translation...';
}

type Card = { id: string; front: string; back: string };

interface WriteModeClientProps {
  deckId: string;
  deckTitle: string;
  cards: Card[];
  userId: string;
  nativeLanguage?: string | null;
}

export default function WriteModeClient({ deckId, deckTitle, cards: initialCards, userId, nativeLanguage }: WriteModeClientProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  // Shuffle on mount
  const [cards] = useState<Card[]>(() => {
    const shuffled = [...initialCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState<'typing' | 'correct' | 'incorrect'>('typing');
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [failedCardIds, setFailedCardIds] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const shakeControls = useAnimationControls();
  const placeholder = getPlaceholder(nativeLanguage);

  useEffect(() => {
    // Intentionally left empty to stop focus stealing on mobile
  }, [status, currentIndex]);

  const triggerShake = useCallback(async () => {
    await shakeControls.start({
      x: [-10, 10, -8, 8, -5, 5, 0],
      transition: { duration: 0.45, ease: 'easeInOut' },
    });
  }, [shakeControls]);

  const fireReview = useCallback(async (cardId: string, isCorrect: boolean, isFirstTry: boolean) => {
    try {
      await binaryReviewFlashcard(cardId, isCorrect, userId);
      if (isCorrect && isFirstTry) {
        // +3 XP per card, already handled by binaryReviewFlashcard server action
        setXpEarned(prev => prev + 3);
      }
    } catch {
      toast.error('Failed to sync progress. Check your connection.');
    }
  }, [userId]);

  if (cards.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground font-bold">This deck has no cards.</p>
      </div>
    );
  }

  // ── Summary screen ──────────────────────────────────────────────────────────
  if (currentIndex >= cards.length) {
    const accuracy = Math.round((correctCount / cards.length) * 100);
    const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 bg-background text-center overflow-auto">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="w-28 h-28 rounded-full bg-[#00e676]/15 border-2 border-[#00e676]/30 flex items-center justify-center mb-6"
          style={{ boxShadow: '0 0 60px rgba(0,230,118,0.2)' }}
        >
          <Trophy className="w-14 h-14 text-[#00e676]" />
        </motion.div>

        <motion.h2
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-black text-foreground mb-2"
        >
          Write Mode Complete!
        </motion.h2>

        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-muted-foreground text-sm mb-6"
        >
          {deckTitle}
        </motion.p>

        {/* Stars */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-8"
        >
          {[1, 2, 3].map(s => (
            <Star
              key={s}
              className={`w-9 h-9 transition-all ${s <= stars ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-foreground/15 dark:text-white/15'}`}
              style={s <= stars ? { filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.6))' } : undefined}
            />
          ))}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8"
        >
          {[
            { label: 'Correct', value: correctCount, color: '#00e676' },
            { label: 'Accuracy', value: `${accuracy}%`, color: '#00d4d4' },
            { label: 'XP Earned', value: `+${xpEarned}`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl p-3 border"
              style={{ background: `${color}10`, borderColor: `${color}30` }}
            >
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* XP Banner */}
        {xpEarned > 0 && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 mb-6"
          >
            <Zap className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm font-black text-[#f59e0b]">+{xpEarned} XP added to your account!</span>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Link href={`/flashcards/${deckId}`}>
            <button className="px-8 py-3.5 rounded-full font-black text-black bg-[#00d4d4] hover:bg-[#00b8b8] active:scale-95 transition shadow-none md:shadow-[0_0_30px_rgba(0,212,212,0.35)]">
              Return to Deck
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const checkAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (status === 'typing') {
      if (!inputVal.trim()) return;
      
      // First check exact match
      let isMatch = inputVal.trim().toLowerCase() === currentCard.back.trim().toLowerCase();
      
      // If not exact match, use LLM to check semantic correctness
      if (!isMatch) {
        try {
          const res = await fetch('/api/flashcards/check-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAnswer: inputVal, correctAnswer: currentCard.back }),
          });
          const data = await res.json();
          if (data.isCorrect) {
            isMatch = true;
          }
        } catch (err) {
          // Fallback to exact match if LLM fails
          console.error('LLM check failed, using exact match:', err);
        }
      }
      
      setStatus(isMatch ? 'correct' : 'incorrect');
      const isFirstTry = !failedCardIds.has(currentCard.id);

      if (isMatch) {
        if (isFirstTry) {
          setCorrectCount(prev => prev + 1);
        }
      } else {
        setFailedCardIds(prev => new Set(prev).add(currentCard.id));
        triggerShake();
      }

      // Fire FSRS update immediately (fire-and-forget, non-blocking)
      setSubmitting(true);
      fireReview(currentCard.id, isMatch, isFirstTry).finally(() => setSubmitting(false));

    } else if (status === 'correct') {
      setCurrentIndex(prev => prev + 1);
      setStatus('typing');
      setInputVal('');

    } else if (status === 'incorrect') {
      // Must type the correct answer to advance
      if (inputVal.trim().toLowerCase() === currentCard.back.trim().toLowerCase()) {
        setCurrentIndex(prev => prev + 1);
        setStatus('typing');
        setInputVal('');
      } else {
        triggerShake();
        setInputVal('');
      }
    }
  };

  const progress = (currentIndex / cards.length) * 100;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Progress bar */}
      <div className="h-1 w-full bg-[var(--border)] overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#00d4d4] to-[#0098db]"
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
      </div>

      <header className="shrink-0 px-4 pt-4 md:px-8 flex items-center justify-between">
        <Link href={`/flashcards/${deckId}`}>
          <button className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border)] text-muted-foreground hover:bg-[var(--border)] transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground">{currentIndex + 1} / {cards.length}</span>
          <div className="text-xs uppercase font-bold tracking-widest text-[#f59e0b] border border-[#f59e0b]/30 px-3 py-1 bg-[#f59e0b]/10 rounded-full">
            Write Mode
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 max-w-2xl mx-auto w-full">
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[40vh]">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-4xl md:text-5xl font-black text-center text-foreground leading-tight tracking-tight mb-8"
            >
              {currentCard.front}
            </motion.h2>
          </AnimatePresence>

          <AnimatePresence>
            {status === 'incorrect' && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full p-5 rounded-2xl bg-rose-500/15 border border-rose-500/30 mb-6 backdrop-blur-sm"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1.5">Incorrect. Correct answer:</p>
                <p className="text-2xl font-black text-[#00e676]">{currentCard.back}</p>
                <p className="text-xs text-muted-foreground mt-2">Type it below to continue →</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={checkAnswer} className="w-full mt-auto">
          <motion.div className="relative" animate={shakeControls}>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={status === 'incorrect' ? `Type: ${currentCard.back}` : placeholder}
              disabled={status === 'correct'}
              className={`w-full py-5 px-6 rounded-2xl text-lg md:text-xl outline-none font-bold transition-all border-2
                ${status === 'typing'
                  ? 'border-[var(--border)] focus:border-[#00d4d4] bg-[var(--border)]/30 text-foreground placeholder:text-muted-foreground/50'
                  : status === 'correct'
                  ? 'border-[#00e676] bg-[#00e676]/10 text-[#00e676]'
                  : 'border-red-500 bg-red-500/10 text-red-500 placeholder:text-red-400/60'}`}
            />
            {status === 'correct' && <Check className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#00e676]" />}
            {status === 'incorrect' && inputVal.length > 0 && inputVal.trim().toLowerCase() !== currentCard.back.trim().toLowerCase() && (
              <X className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />
            )}
          </motion.div>

          <button
            type="submit"
            disabled={submitting && status !== 'incorrect'}
            className={`w-full py-4 mt-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-70
              ${status === 'typing'
                ? 'bg-[#00d4d4] text-black shadow-[0_0_20px_rgba(0,212,212,0.4)]'
                : status === 'correct'
                ? 'bg-[#00e676] text-black shadow-[0_0_20px_rgba(0,230,118,0.4)]'
                : 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}
          >
            {status === 'typing'
              ? 'Check Answer'
              : status === 'correct'
              ? 'Continue →'
              : 'Type the correct answer to continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
