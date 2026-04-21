'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Heart, DownloadCloud, Library, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/theme-context';
import { toggleDeckLike, importPublicDeck } from '@/app/actions/flashcard';
import { toast } from 'sonner';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

type PublicDeck = {
  id: string;
  title: string;
  description?: string | null;
  likesCount: number;
  likes: { id: string }[];
  _count?: { cards: number };
  user?: { name?: string | null } | null;
};

export default function LibraryClient({ userId, publicDecks: initialDecks, initialQuery }: {
  userId: string;
  publicDecks: PublicDeck[];
  initialQuery: string;
}) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  // Optimistic local deck state — key for instant like feedback
  const [decks, setDecks] = useState<PublicDeck[]>(initialDecks);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/flashcards/library?q=${encodeURIComponent(query)}`);
  };

  const handleLike = async (deckId: string) => {
    // Optimistic update first — instant feedback
    setDecks(prev => prev.map(d => {
      if (d.id !== deckId) return d;
      const isCurrentlyLiked = d.likes.length > 0;
      return {
        ...d,
        likes: isCurrentlyLiked ? [] : [{ id: 'optimistic' }],
        likesCount: isCurrentlyLiked ? d.likesCount - 1 : d.likesCount + 1,
      };
    }));

    try {
      await toggleDeckLike(userId, deckId);
      // Silently refresh in background to sync true DB state
      router.refresh();
    } catch {
      // Revert on failure
      setDecks(prev => prev.map(d => {
        if (d.id !== deckId) return d;
        const wasLiked = d.likes.length === 0; // reversed by optimistic
        return {
          ...d,
          likes: wasLiked ? [{ id: 'optimistic' }] : [],
          likesCount: wasLiked ? d.likesCount + 1 : d.likesCount - 1,
        };
      }));
      toast.error('Failed to update like status');
    }
  };

  const handleImport = async (deckId: string) => {
    try {
      setIsImporting(deckId);
      await importPublicDeck(userId, deckId);
      toast.success('Deck imported successfully!');
      router.push('/flashcards');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import deck');
    } finally {
      setIsImporting(null);
    }
  };

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'radial-gradient(circle at 50% -20%, rgba(245,158,11,0.15) 0%, transparent 80%)'
            : 'radial-gradient(circle at 50% -20%, rgba(245,158,11,0.08) 0%, transparent 80%)',
        }} />
      </div>

      <header className="shrink-0 px-6 pt-safe-or-0 md:px-8 mt-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/flashcards">
            <motion.button
              whileTap={{ scale: 0.94 }}
              className="w-10 h-10 rounded-full flex items-center justify-center liquid-glass shadow-sm border border-[var(--border)]"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black tracking-tight truncate text-foreground">Community Library</h1>
            <p className="text-xs font-semibold text-muted-foreground">Discover new vocabulary sets</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. 'IELTS', 'IT Vocabulary'..."
            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-transparent border focus:outline-none transition-colors"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
              color: 'var(--foreground)'
            }}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
        </form>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 md:px-8 no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-4">

          {decks.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center opacity-50">
              <Library className="w-12 h-12 mb-4" />
              <p className="font-bold text-lg mb-2">No decks found</p>
              <p className="text-sm">Try tweaking your search terms.</p>
            </div>
          ) : (
            decks.map((deck) => {
              const isLiked = deck.likes.length > 0;
              return (
                <motion.div
                  key={deck.id}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className="p-5 rounded-3xl flex items-center justify-between gap-4 liquid-glass border border-[var(--border)] shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1 truncate">{deck.title}</h3>
                    <p className="text-xs font-medium text-muted-foreground mb-2 line-clamp-2">
                      {deck.description || 'No description provided'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#00d4d4]">
                      <span>{deck._count?.cards || 0} Terms</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">By {deck.user?.name || 'Aura Community'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <motion.button
                      onClick={() => handleLike(deck.id)}
                      whileTap={{ scale: 0.85 }}
                      transition={SPRING}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors"
                    >
                      <motion.div
                        animate={{ scale: isLiked ? [1, 1.35, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart className={`w-4 h-4 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                      </motion.div>
                      <span className="text-xs font-bold text-foreground">{deck.likesCount}</span>
                    </motion.button>

                    <motion.button
                      onClick={() => handleImport(deck.id)}
                      disabled={isImporting === deck.id}
                      whileTap={{ scale: 0.94 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black text-black"
                      style={{
                        background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                        boxShadow: '0 4px 14px rgba(0,212,212,0.3)',
                        opacity: isImporting === deck.id ? 0.7 : 1,
                      }}
                    >
                      {isImporting === deck.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                      {isImporting === deck.id ? 'Importing...' : 'Add Deck'}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
