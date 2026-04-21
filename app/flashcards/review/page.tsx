'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Check, X, ArrowLeft, Flame } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { haptics } from '@/lib/utils/haptics';
import { useTheme } from '@/lib/contexts/theme-context';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  repetition: number;
  interval: number;
  type: string;
  englishExplanation?: string | null;
}

export default function FlashcardsReviewPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.9, 1, 0.9]);
  
  const rightBg = useTransform(x, [0, 100], ['rgba(0,0,0,0)', 'rgba(0, 230, 118, 0.2)']);
  const leftBg = useTransform(x, [0, -100], ['rgba(0,0,0,0)', 'rgba(239, 68, 68, 0.2)']);

  // Swipe indicator opacities — hoisted to top level to comply with Rules of Hooks
  const leftIndicatorOpacity = useTransform(x, [0, -100], [0, 1]);
  const rightIndicatorOpacity = useTransform(x, [0, 100], [0, 1]);
  const leftXIndicator = useTransform(x, [0, -60], [0, 1]);
  const leftXPos = useTransform(x, [0, -60], [-20, 20]);
  const rightXIndicator = useTransform(x, [0, 60], [0, 1]);
  const rightXPos = useTransform(x, [0, 60], [20, -20]);

  const controls = useAnimation();

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/flashcards?due=1');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (err) {
      toast.error('Could not load cards');
    } finally {
      setLoading(false);
    }
  };

  const currentCard = cards[currentIndex];

  const handleReview = async (remembered: boolean) => {
    if (!currentCard) return;
    
    try {
      await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentCard.id, remembered }),
      });

      if (currentIndex < cards.length - 1) {
        setIsRevealed(false);
        setCurrentIndex(prev => prev + 1);
      } else {
        setCards([]); 
      }
    } catch (err) {
      toast.error('Sync failed');
    }
  };

  const handleDragEnd = async (e: any, info: any) => {
    if (!isRevealed) {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      return;
    }

    const threshold = 100;
    if (info.offset.x > threshold) {
      haptics.success();
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.2 } });
      handleReview(true);
      x.set(0);
      controls.set({ x: 0, opacity: 1 });
    } else if (info.offset.x < -threshold) {
      haptics.error();
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.2 } });
      handleReview(false);
      x.set(0);
      controls.set({ x: 0, opacity: 1 });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-cyan)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-24 h-24 shadow-lg rounded-[32px] mb-8 flex items-center justify-center liquid-glass"
          style={{ boxShadow: '0 20px 60px rgba(0,212,212,0.3)' }}
        >
          <Check className="w-10 h-10 text-[var(--accent-cyan)]" />
        </motion.div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">You're all caught up!</h1>
        <p className="text-[var(--foreground-muted)] mb-8 text-center max-w-[280px] leading-relaxed">
          No more flashcards due for review. Take a break or learn new words.
        </p>
        <Link href="/flashcards">
          <button className="px-8 py-4 rounded-full font-black text-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)' }}>
            Return to Deck
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Dynamic Backgrounds based on swipe */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ background: rightBg }} />
      <motion.div className="absolute inset-0 pointer-events-none" style={{ background: leftBg }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-safe-or-0 mt-8 mb-4">
        <Link href="/flashcards">
          <button className="w-10 h-10 rounded-full flex items-center justify-center liquid-glass shadow border border-[var(--border)] transition-transform active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass border" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
            <Flame className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase">
              {cards.length - currentIndex} Due
            </span>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Active Card Container */}
      <div className="flex-1 relative flex items-center justify-center w-full max-w-sm mx-auto perspective-1000 mb-[12dvh]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentCard.id}
            drag={isRevealed ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            animate={controls}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
            className={`absolute inset-x-4 top-4 bottom-4 rounded-[40px] flex flex-col p-8 cursor-grab active:cursor-grabbing shadow-2xl transition-shadow ${isRevealed ? 'liquid-glass-strong' : ''}`}
            onClick={() => !isRevealed && setIsRevealed(true)}
            style={{
              x, rotate, opacity, scale,
              background: isRevealed 
                ? (isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.9)')
                : 'linear-gradient(135deg, rgba(0,212,212,0.15), rgba(0,152,219,0.15))',
              border: isRevealed
                ? `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
                : '1px solid rgba(0,212,212,0.3)',
              boxShadow: isRevealed
                ? '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                : 'inset 0 0 40px rgba(0,212,212,0.2), 0 20px 60px rgba(0,212,212,0.2)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            }}
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {!isRevealed ? (
                <>
                  <span className="absolute top-8 text-[10px] font-black tracking-[0.2em] opacity-40 uppercase">Tap to reveal</span>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">{currentCard.front}</h2>
                </>
              ) : (
                <div className="flex flex-col gap-6 w-full h-full justify-center text-center items-center">
                  <h2 className="text-3xl font-black tracking-tight text-[var(--accent-cyan)]">{currentCard.back}</h2>
                  {currentCard.englishExplanation && (
                    <div className="px-4 py-4 rounded-3xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)'}}>
                      <p className="text-sm font-medium leading-relaxed text-[var(--foreground-muted)] text-left">
                        {currentCard.englishExplanation}
                      </p>
                    </div>
                  )}
                  <span className="absolute bottom-8 left-0 right-0 text-[10px] font-black tracking-[0.2em] opacity-40 uppercase pointer-events-none">Swipe to Answer <br/> ← No    Yes →</span>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Swipe Indicators overlay */}
        <motion.div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-red-500/0 to-transparent z-[-1]" style={{ opacity: leftIndicatorOpacity }} />
        <motion.div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#00e676]/0 to-transparent z-[-1]" style={{ opacity: rightIndicatorOpacity }} />
        
        <motion.div 
          className="pointer-events-none absolute top-1/2 left-0 transform -translate-y-1/2 flex flex-col items-center justify-center z-50 mix-blend-plus-lighter"
          style={{ opacity: leftXIndicator, x: leftXPos }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 mb-2 shadow-2xl">
            <X className="w-8 h-8 text-white stroke-[3px]" />
          </div>
        </motion.div>

        <motion.div 
          className="pointer-events-none absolute top-1/2 right-0 transform -translate-y-1/2 flex flex-col items-center justify-center z-50 mix-blend-plus-lighter"
          style={{ opacity: rightXIndicator, x: rightXPos }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#00e676] mb-2 shadow-2xl">
            <Check className="w-8 h-8 text-black stroke-[3px]" />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
