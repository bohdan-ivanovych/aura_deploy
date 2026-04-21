'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Check, X, ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { SPRING_OPTIONS } from '@/lib/config';
import { haptics } from '@/lib/utils/haptics';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  repetition: number;
  interval: number;
  type: string;
  englishExplanation?: string | null;
}

export default function PracticePage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentValue] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardPreference, setCardPreference] = useState<'translation' | 'explanation' | 'both'>('both');
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        const pref = data?.user?.cardPreference;
        if (pref === 'translation' || pref === 'explanation' || pref === 'both') {
          setCardPreference(pref);
        }
      } catch {
        // fail silently – fall back to 'both'
      } finally {
        fetchCards();
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/flashcards?due=1');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (err) {
      toast.error('Could not load neural patterns');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextInterval = (card: Flashcard, remembered: boolean) => {
    // Simple SM-2 simulation for UI feedback only
    if (!remembered) return '10m';
    const nextRep = card.repetition + 1;
    if (nextRep === 1) return '1d';
    if (nextRep === 2) return '6d';
    const nextInterval = Math.round(card.interval * 2.5);
    return `${nextInterval}d`;
  };

  const handleReview = async (remembered: boolean) => {
    const card = cards[currentIndex];
    setIsRevealed(false);
    
    try {
      await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, remembered }),
      });

      if (currentIndex < cards.length - 1) {
        setCurrentValue(prev => prev + 1);
      } else {
        setCards([]); // Finished session
      }
    } catch (err) {
      toast.error('Sync failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-20 h-20 squircle-xl glass flex items-center justify-center mb-6">
        <Check className="w-10 h-10 glow-cyan" />
      </div>
      <h2 className="text-2xl font-black tracking-tighter mb-2 brutal-heading glow-cyan">PRACTICE READY</h2>
      <p className="text-[var(--foreground-muted)] text-sm max-w-xs mb-8 font-medium">
        No cards due for review
      </p>
      <Link href="/flashcards">
        <button className="px-8 py-3 bio-cyan squircle text-xs font-bold text-black shadow-[var(--shadow-glow-cyan)]">
          Return to Deck
        </button>
      </Link>
    </div>
  );

  const currentCard = cards[currentIndex];
  const showTranslation = cardPreference === 'translation' || cardPreference === 'both';
  const showExplanation = cardPreference === 'explanation' || cardPreference === 'both';

  const handleSpeak = () => {
    if (!speechSupported) return;
    const text = currentCard.front;
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-full p-6 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-6 max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between mb-12">
        <Link href="/flashcards">
          <button className="tap-target squircle glass hover:bg-[var(--surface-hover)] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
        </Link>
        <div className="flex flex-col items-center gap-1">
          <p className="micro-copy glow-cyan">PRACTICE</p>
          <p className="text-xs font-bold text-[var(--foreground)]">
            {currentIndex + 1} / {cards.length}
          </p>
        </div>
        <div className="w-9" />
      </div>

      {/* 3D Scene Wrapper */}
      <div 
        className="flex-1 relative w-full flex items-center justify-center my-8"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id + isRevealed}
            initial={{ opacity: 0, rotateY: isRevealed ? -100 : 100, scale: 0.85, z: -200 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1, z: 0 }}
            exit={{ opacity: 0, rotateY: isRevealed ? 100 : -100, scale: 0.85, z: -200 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className={`w-full max-w-sm aspect-[3/4] squircle-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl ${
              isRevealed ? 'bg-[var(--surface)]' : 'bg-gradient-to-br from-[#00d4d4]/10 to-[#0098db]/10'
            }`}
            style={{ 
              border: `1px solid ${isRevealed ? 'var(--border)' : 'rgba(0,212,212,0.3)'}`,
              boxShadow: isRevealed 
                ? '0 20px 60px rgba(0,0,0,0.5)' 
                : 'inset 0 0 40px rgba(0,212,212,0.1), 0 20px 60px rgba(0,212,212,0.15)',
              backdropFilter: 'blur(30px) saturate(150%)',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Dynamic specular lighting / glare effect */}
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)'
              }}
            />
            
            <p className="absolute top-6 left-0 right-0 micro-copy tracking-[0.3em] opacity-40"
              style={{ transform: 'translateZ(20px)' }}>
              {isRevealed ? 'BACK OF CARD' : 'FRONT OF CARD'}
            </p>

            <div className="w-full flex-1 flex flex-col items-center justify-center translate-z-10" style={{ transform: 'translateZ(40px)' }}>
              {!isRevealed ? (
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white mb-6 drop-shadow-md">
                  {currentCard.front}
                </h3>
              ) : (
                <div className="space-y-4 max-w-full">
                  {showTranslation && (
                    <h3 className="text-3xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                      {currentCard.back}
                    </h3>
                  )}
                  {showExplanation && currentCard.englishExplanation && (
                    <p className="text-sm font-medium text-white/70 leading-relaxed max-w-[90%] mx-auto">
                      {currentCard.englishExplanation}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4" style={{ transform: 'translateZ(30px)' }}>
              {!isRevealed && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsRevealed(true)}
                  className="px-8 py-3.5 rounded-2xl text-[11px] font-black tracking-[0.2em] transition-all w-48 text-black"
                  style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)', boxShadow: '0 8px 24px rgba(0,212,212,0.3)' }}
                >
                  REVEAL
                </motion.button>
              )}
              {isRevealed && speechSupported && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSpeak}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  🔊
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 h-20">
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <button
                onClick={() => { haptics.error(); handleReview(false); }}
                className="group flex flex-col items-center gap-1 p-4 squircle-xl hover:bg-red-500/20 transition-all"
              >
                <span className="micro-copy text-red-400">NEED PRACTICE</span>
                <span className="text-[9px] font-bold text-red-400/40">REVIEW IN {calculateNextInterval(currentCard, false)}</span>
              </button>

              <button
                onClick={() => { haptics.success(); handleReview(true); }}
                className="group flex flex-col items-center gap-1 p-4 squircle-xl bio-cyan transition-all shadow-[var(--shadow-glow-cyan)]"
              >
                <span className="micro-copy text-black">FIXED</span>
                <span className="text-[9px] font-bold text-black/60">REVIEW IN {calculateNextInterval(currentCard, true)}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
