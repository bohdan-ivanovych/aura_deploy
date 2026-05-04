'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Brain, Edit3, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/theme-context';
import FlashcardItem from '../components/FlashcardItem';
import FlashcardFormModal from '../components/FlashcardFormModal';
import { useInViewport } from '@/lib/utils/intersection-loader';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

export default function DeckDetailsClient({ userId, deckId, deckTitle, cards: initialCards, isSystemDeck }: any) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [localCards, setLocalCards] = useState<any[]>(initialCards);

  const [visibleCount, setVisibleCount] = useState(30);
  const [loaderRef, inView] = useInViewport<HTMLDivElement>({ threshold: 0, rootMargin: '600px 0px', once: false });

  useEffect(() => {
    if (inView && visibleCount < localCards.length) {
      setVisibleCount(prev => prev + 30);
    }
  }, [inView, localCards.length]);

  const openEdit = (card: any) => {
    setEditingCard(card);
    setCreateOpen(true);
  };

  const closeForm = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setTimeout(() => setEditingCard(null), 200);
      // Refresh server data to pick up create/edit changes
      router.refresh();
    }
  };

  const handleStarToggle = useCallback((cardId: string, newStarred: boolean) => {
    setLocalCards(prev => prev.map(c => c.id === cardId ? { ...c, isStarred: newStarred } : c));
  }, []);

  const handleDelete = useCallback((cardId: string) => {
    // Optimistic removal from list
    setLocalCards(prev => prev.filter(c => c.id !== cardId));
  }, []);

  const MODES = [
    { name: 'Flashcards', icon: BookOpen, color: '#00d4d4', gradient: 'rgba(0,212,212,0.1)', path: `/flashcards/${deckId || 'main'}/practice` },
    { name: 'Learn', icon: Brain, color: '#00e676', gradient: 'rgba(0,230,118,0.1)', path: `/flashcards/${deckId || 'main'}/learn` },
    { name: 'Write', icon: Edit3, color: '#f59e0b', gradient: 'rgba(245,158,11,0.1)', path: `/flashcards/${deckId || 'main'}/write` },
    { name: 'Test', icon: FileText, color: '#ec4899', gradient: 'rgba(236,72,153,0.1)', path: `/flashcards/${deckId || 'main'}/test` },
  ];

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Dynamic Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,212,212,0.15) 0%, transparent 80%)'
            : 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,212,212,0.08) 0%, transparent 80%)',
        }} />
      </div>

      <header className="shrink-0 px-6 pt-safe-or-0 md:px-8 mt-6">
        <div className="flex items-center gap-4">
          <Link href="/flashcards">
            <motion.button
              whileTap={{ scale: 0.94 }}
              className="w-10 h-10 rounded-full flex items-center justify-center liquid-glass shadow-sm border border-[var(--border)]"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black tracking-tight truncate text-foreground">{deckTitle}</h1>
            <p className="text-xs font-semibold text-muted-foreground">{localCards.length} terms</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 md:px-8 no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Modes Grid */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MODES.map((mode) => (
                <Link key={mode.name} href={mode.path}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING}
                    className="flex flex-col items-center justify-center p-6 rounded-3xl cursor-pointer"
                    style={{
                      background: mode.gradient,
                      border: `1px solid ${mode.color}`,
                      boxShadow: `0 4px 20px ${mode.color}20`,
                    }}
                  >
                    <mode.icon className="w-8 h-8 mb-3" style={{ color: mode.color }} />
                    <span className="text-sm font-bold text-foreground">{mode.name}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>

          {/* Cards List */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#00d4d4]">
                Terms in this set
              </h2>
              <div className="flex items-center gap-3">
                {localCards.length > 0 && (
                  <motion.button
                    onClick={() => {
                      const text = localCards.map((c: any) => `${c.front}\t${c.back}`).join('\n');
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text);
                        import('sonner').then(m => m.toast.success('Deck copied to clipboard! (Tab separated)'));
                      } else {
                        // Fallback
                        const textArea = document.createElement('textarea');
                        textArea.value = text;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          import('sonner').then(m => m.toast.success('Deck copied to clipboard! (Tab separated)'));
                        } catch (err) {
                          import('sonner').then(m => m.toast.error('Failed to copy.'));
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-10 px-4 rounded-full flex gap-2 items-center text-xs font-black uppercase tracking-widest transition-colors"
                    style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    Export
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setCreateOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)' }}
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {localCards.slice(0, visibleCount).map((card: any, idx: number) => (
                  <FlashcardItem
                    key={card.id}
                    card={card}
                    userId={userId}
                    index={idx}
                    onEdit={() => openEdit(card)}
                    onStarToggle={handleStarToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
              
              {visibleCount < localCards.length && (
                <div ref={loaderRef} className="h-20 w-full flex items-center justify-center opacity-50 py-4">
                  <span className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent-cyan)] animate-spin" />
                </div>
              )}

              {localCards.length === 0 && (
                <div className="text-center py-16 opacity-50">
                  <p className="font-bold text-lg mb-2">No terms yet</p>
                  <p className="text-sm">Click the plus button to add your first term.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      <FlashcardFormModal
        open={createOpen}
        onOpenChange={closeForm}
        deckId={deckId === 'stars' ? null : deckId}
        editingCard={editingCard}
        userId={userId}
      />
    </div>
  );
}
