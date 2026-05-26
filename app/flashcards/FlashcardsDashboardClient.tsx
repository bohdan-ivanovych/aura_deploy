'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Star, Brain, Library, Search, AlertCircle, BookA } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/theme-context';
import { CreateDeckModal } from '@/components/flashcards/CreateDeckModal';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

interface FlashcardsProps {
  userId?: string;
  decks?: any[];
  mainDeckCardCount?: number;
  starredCardCount?: number;
  learningCount?: number;
  grammarMistakesCount?: number;
  grammarMistakesDeckId?: string | null;
  vocabMistakesCount?: number;
  vocabMistakesDeckId?: string | null;
  legacyMistakesCount?: number;
  legacyMistakesDeckId?: string | null;
}

export default function FlashcardsDashboardClient(props: FlashcardsProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Self-loading: fetch data if no props provided (when mounted as a tab)
  const [data, setData] = useState<{
    decks: any[];
    mainDeckCardCount: number;
    starredCardCount: number;
    learningCount: number;
    grammarMistakesCount: number;
    grammarMistakesDeckId: string | null;
    vocabMistakesCount: number;
    vocabMistakesDeckId: string | null;
    legacyMistakesCount: number;
    legacyMistakesDeckId: string | null;
    loading: boolean;
  }>({
    decks: props.decks ?? [],
    mainDeckCardCount: props.mainDeckCardCount ?? 0,
    starredCardCount: props.starredCardCount ?? 0,
    learningCount: props.learningCount ?? 0,
    grammarMistakesCount: props.grammarMistakesCount ?? 0,
    grammarMistakesDeckId: props.grammarMistakesDeckId ?? null,
    vocabMistakesCount: props.vocabMistakesCount ?? 0,
    vocabMistakesDeckId: props.vocabMistakesDeckId ?? null,
    legacyMistakesCount: props.legacyMistakesCount ?? 0,
    legacyMistakesDeckId: props.legacyMistakesDeckId ?? null,
    loading: !props.decks, // Only loading if no props
  });

  useEffect(() => {
    // If rendered with props from server, skip fetching
    if (props.decks) return;

    let mounted = true;
    const load = async () => {
      try {
        const cardsRes = await fetch('/api/flashcards');
        const cardsData = await cardsRes.json();
        const allCards: any[] = cardsData.cards ?? [];
        
        // Compute stats client-side
        const mainCount = allCards.filter((c: any) => !c.deckId).length;
        const starredCount = allCards.filter((c: any) => c.isStarred).length;
        const learning = allCards.filter((c: any) => (c.fsrsScheduledDays ?? 0) < 21).length;

        if (!mounted) return;
        setData({
          decks: [],
          mainDeckCardCount: mainCount,
          starredCardCount: starredCount,
          learningCount: learning,
          grammarMistakesCount: 0,
          grammarMistakesDeckId: null,
          vocabMistakesCount: 0,
          vocabMistakesDeckId: null,
          legacyMistakesCount: 0,
          legacyMistakesDeckId: null,
          loading: false,
        });
      } catch {
        if (mounted) setData(prev => ({ ...prev, loading: false }));
      }
    };
    void load();
    return () => { mounted = false; };
  }, [props.decks]);

  const { decks, mainDeckCardCount, starredCardCount, learningCount, grammarMistakesCount, grammarMistakesDeckId, vocabMistakesCount, vocabMistakesDeckId, legacyMistakesCount, legacyMistakesDeckId, loading: isLoading } = data;

  const handleCreateDeck = () => {
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Skeleton header */}
        <div className="shrink-0 px-6 pb-6 md:px-8"
          style={{ paddingTop: 'max(2rem, calc(1rem + env(safe-area-inset-top, 0px)))' }}>
          <div className="skeleton h-8 w-32 rounded-xl" />
        </div>
        <div className="flex-1 px-4 py-8 md:px-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="skeleton h-4 w-24 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl p-6 space-y-3"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                  <div className="skeleton h-5 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-1/2 rounded-lg" />
                  <div className="skeleton h-6 w-24 rounded-full mt-6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* Ambient BG */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'radial-gradient(60% 55% at 20% 8%, rgba(0,230,118,0.10) 0%, transparent 65%), radial-gradient(55% 50% at 75% 12%, rgba(0,212,212,0.08) 0%, transparent 62%)'
            : 'radial-gradient(60% 55% at 20% 8%, rgba(0,230,118,0.05) 0%, transparent 65%)',
        }} />
        {isDark && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 50%, #000 100%)' }} />}
      </div>

      {/* Header */}
      <header
        className="shrink-0 px-6 pb-6 md:px-8"
        style={{
          paddingTop: 'max(2rem, calc(1rem + env(safe-area-inset-top, 0px)))',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: isDark ? '#fff' : '#1D1D1F', letterSpacing: '-0.04em' }}>
            Flashcards
          </h1>
          <div className="flex items-center gap-2 shrink-0">

            
            <Link href="/flashcards/library">
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.04 }}
                transition={SPRING}
                className="flex items-center gap-1.5 font-semibold px-4 rounded-full"
                style={{
                  fontSize: '13px',
                  minHeight: '44px',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                  color: isDark ? '#fff' : '#1D1D1F',
                }}
              >
                <Search className="w-3.5 h-3.5" />
                Library
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Core Decks */}
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 pl-2" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Your Collections
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Main Deck */}
              <Link href="/flashcards/main">
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={SPRING}
                  className="relative rounded-3xl p-6 overflow-hidden cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(0,230,118,0.05)' : 'rgba(0,230,118,0.08)',
                    border: '1px solid rgba(0,230,118,0.2)',
                    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-24 h-24 text-[#00e676]" />
                  </div>
                  <h3 className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>Main Collection</h3>
                  <p className="text-sm font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {mainDeckCardCount} terms
                  </p>
                  
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <div className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(0,230,118,0.15)', color: '#00e676' }}>
                      {learningCount} Still learning
                    </div>
                  </div>
                </motion.div>
              </Link>
              
              {/* Grammar Mistakes Deck */}
              <Link href={grammarMistakesDeckId ? `/flashcards/${grammarMistakesDeckId}` : '/flashcards'}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={SPRING}
                  className="relative rounded-3xl p-6 overflow-hidden cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertCircle className="w-24 h-24 text-red-500" />
                  </div>
                  <h3 className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>Grammar Mistakes</h3>
                  <p className="text-sm font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {grammarMistakesCount} cards
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <div className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      From chat corrections
                    </div>
                  </div>
                </motion.div>
              </Link>

              {/* Vocabulary Mistakes Deck */}
              <Link href={vocabMistakesDeckId ? `/flashcards/${vocabMistakesDeckId}` : '/flashcards'}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={SPRING}
                  className="relative rounded-3xl p-6 overflow-hidden cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BookA className="w-24 h-24 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>Vocabulary Mistakes</h3>
                  <p className="text-sm font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {vocabMistakesCount} cards
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <div className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                      From bad word choices
                    </div>
                  </div>
                </motion.div>
              </Link>

              {/* Legacy Mistakes Deck */}
              {(legacyMistakesCount > 0 || legacyMistakesDeckId) && (
                <Link href={legacyMistakesDeckId ? `/flashcards/${legacyMistakesDeckId}` : '/flashcards'}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={SPRING}
                    className="relative rounded-3xl p-6 overflow-hidden cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <AlertCircle className="w-24 h-24 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>Legacy Mistakes</h3>
                    <p className="text-sm font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                      {legacyMistakesCount} cards
                    </p>
                  </motion.div>
                </Link>
              )}

              {/* Starred Elements */}
              <Link href="/flashcards/stars">
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={SPRING}
                  className="relative rounded-3xl p-6 overflow-hidden cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star className="w-24 h-24 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>Polar Stars</h3>
                  <p className="text-sm font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {starredCardCount} starred terms
                  </p>
                </motion.div>
              </Link>
            </div>
          </section>

          {/* User Custom Decks */}
          <section>
            <div className="flex items-center justify-between mb-4 pl-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                Your Decks
              </h2>
              {decks.length > 0 && (
                <button 
                  onClick={handleCreateDeck}
                  disabled={isCreating}
                  className="text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50" 
                  style={{ color: '#00d4d4' }}
                >
                  {isCreating ? 'Creating...' : '+ Create Deck'}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center rounded-3xl"
                  style={{ border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                  <Library className="w-8 h-8 mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }} />
                  <p className="text-sm font-medium mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)' }}>
                    You haven't created any custom decks yet.
                  </p>
                  <button 
                    onClick={handleCreateDeck}
                    disabled={isCreating}
                    className="px-5 rounded-full font-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100" 
                    style={{ background: '#00d4d4', color: '#000', fontSize: '14px', minHeight: '44px' }}
                  >
                    {isCreating ? 'Creating...' : '+ Create Deck'}
                  </button>
                </div>
              ) : (
                decks.map((deck: any) => (
                  <Link key={deck.id} href={`/flashcards/${deck.id}`}>
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={SPRING}
                      className="relative rounded-3xl p-6 cursor-pointer"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                        boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.04)',
                      }}
                    >
                      <h3 className="text-base font-bold mb-1" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>{deck.title}</h3>
                      <p className="text-xs font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)' }}>
                        {deck._count?.cards || 0} terms
                      </p>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </section>

        </div>
      </div>

      <CreateDeckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
