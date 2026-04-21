'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Shuffle, Star, Filter, ArrowRight as ArrowRightIcon, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/lib/contexts/theme-context';
import { toggleStar } from '@/app/actions/flashcard';

export default function QuizletPracticeClient({ userId, deckId, deckTitle, cards: initialCards }: any) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [rawCards, setRawCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'learning', 'stars'
  const [answerWith, setAnswerWith] = useState<'term' | 'definition'>('term');

  // Compute active deck based on settings
  const activeCards = useMemo(() => {
    let filtered = [...rawCards];
    if (filterMode === 'learning') filtered = filtered.filter(c => c.status === 'learning');
    if (filterMode === 'stars') filtered = filtered.filter(c => c.isStarred);
    
    if (shuffleOn) {
      // Fisher-Yates shuffle
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }
    return filtered;
  }, [rawCards, filterMode, shuffleOn]);

  const currentCard = activeCards[currentIndex];
  const progress = activeCards.length === 0 ? 0 : ((currentIndex + 1) / activeCards.length) * 100;

  // Keybindings
  const handleNext = useCallback(() => {
    if (currentIndex < activeCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, activeCards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFlip]);

  const handleStarToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    // Optimistic update
    setRawCards((prev: any[]) => prev.map(c => 
      c.id === currentCard.id ? { ...c, isStarred: !c.isStarred } : c
    ));
    
    await toggleStar(currentCard.id, userId);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pt-safe-or-0 mt-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/flashcards/${deckId}`}>
            <button className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border)] liquid-glass">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Practice</span>
            <span className="text-sm font-black text-foreground">{deckTitle}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border)] bg-muted/20"
          >
            <Settings className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 md:px-8 mt-4 overflow-hidden"
          >
            <div className="p-4 rounded-3xl border border-[var(--border)] liquid-glass flex flex-wrap gap-4 items-center text-sm">
              <div className="flex items-center gap-2 mr-4">
                <span className="font-bold text-muted-foreground">Answer with:</span>
                <select 
                  value={answerWith} 
                  onChange={(e: any) => setAnswerWith(e.target.value)}
                  className="bg-background border border-[var(--border)] rounded-full px-3 py-1 outline-none"
                >
                  <option value="term">Term</option>
                  <option value="definition">Definition</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mr-4">
                <span className="font-bold text-muted-foreground">Filter:</span>
                <select 
                  value={filterMode} 
                  onChange={(e: any) => { setFilterMode(e.target.value); setCurrentIndex(0); }}
                  className="bg-background border border-[var(--border)] rounded-full px-3 py-1 outline-none"
                >
                  <option value="all">All Cards</option>
                  <option value="learning">Still Learning Only</option>
                  <option value="stars">Starred Only</option>
                </select>
              </div>

              <button 
                onClick={() => { setShuffleOn(!shuffleOn); setCurrentIndex(0); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${shuffleOn ? 'border-[#00d4d4] text-[#00d4d4] bg-[#00d4d4]/10' : 'border-[var(--border)] text-muted-foreground'}`}
              >
                <Shuffle className="w-4 h-4" /> Shuffle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="px-6 md:px-8 mt-6">
        <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#00d4d4] to-[#0098db]" 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="mt-2 text-[10px] font-black tracking-widest text-[#00d4d4] text-center uppercase">
          {currentIndex + 1} / {activeCards.length || 0}
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-safe-or-0">
        <div className="w-full max-w-xl aspect-[4/3] relative perspective-1000">
          <AnimatePresence mode="wait">
            {activeCards.length > 0 && currentCard ? (
              <motion.div
                key={currentCard.id + (isFlipped ? 'back' : 'front')}
                initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                onClick={handleFlip}
                className="absolute inset-0 w-full h-full rounded-[40px] shadow-2xl flex flex-col items-center justify-center p-8 cursor-pointer text-center liquid-glass border"
                style={{ 
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  background: isDark ? 'rgba(15,15,20,0.85)' : '#fff',
                  transformStyle: 'preserve-3d'
                }}
              >
                <button 
                  onClick={handleStarToggle}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <Star className={`w-6 h-6 ${currentCard.isStarred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                </button>

                {!isFlipped ? (
                  <h2 className="text-4xl font-black text-foreground">
                    {answerWith === 'term' ? currentCard.front : currentCard.back}
                  </h2>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black text-[#00d4d4]">
                      {answerWith === 'term' ? currentCard.back : currentCard.front}
                    </h2>
                    {currentCard.englishExplanation && answerWith === 'term' && (
                      <p className="text-base font-medium text-muted-foreground mt-4 px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5">
                        {currentCard.englishExplanation}
                      </p>
                    )}
                  </div>
                )}
                <div className="absolute bottom-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-50">
                  Tap to flip
                </div>
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center rounded-[40px] border-2 border-dashed border-[var(--border)] text-muted-foreground font-bold">
                No cards match current filters.
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-6">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0 || activeCards.length === 0}
            className="w-14 h-14 rounded-full flex items-center justify-center border border-[var(--border)] disabled:opacity-30 active:scale-95 transition bg-background shadow-lg"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground">
            Swipe or Arrows
          </div>

          <button 
            onClick={handleNext}
            disabled={currentIndex >= activeCards.length - 1 || activeCards.length === 0}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg disabled:opacity-30 active:scale-95 transition text-black"
            style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)' }}
          >
            <ArrowRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
