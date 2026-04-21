'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';


const spring = { type: 'spring' as const, stiffness: 400, damping: 25 };

interface SavePhraseModalProps {
  phrase: string;
  contextSentence: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavePhraseModal({
  phrase,
  contextSentence,
  open,
  onOpenChange,
}: SavePhraseModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState('');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (!open || !phrase.trim()) return;
    setLoading(true);
    setError(null);
    setTranslation('');
    setExplanation('');
    
    // Call server action properly
    const loadDetails = async () => {
      try {
        // Simple fallback since cardDetails.ts was deleted
        const details = { translation: '', explanation: '' };
        setTranslation(details.translation || '');
        setExplanation(details.explanation || '');
      } catch (err) {
        console.error('Failed to load details', err);
        setError('Could not load details');
      } finally {
        setLoading(false);
      }
    };
    
    loadDetails();
  }, [open, phrase, contextSentence]);

  const handleAddFlashcard = async () => {
    if (!phrase.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/create-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: phrase.trim(),
          back: translation,
          type: 'translation',
          contextSentence: contextSentence || phrase,
          englishExplanation: explanation,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Added to Flashcards!', {
          icon: '✨',
          className: 'bg-[var(--surface-active)] text-green-400 border-none px-4 py-3 shadow-[0_4px_20px_rgba(74,222,128,0.2)] rounded-2xl font-bold tracking-wide',
        });
        onOpenChange(false);
      } else if (result?.error === 'Word already in your deck') {
        toast.info('Already in your deck!', {
          className: 'bg-[var(--surface)] backdrop-blur-xl border-[var(--border)] shadow-xl text-[var(--foreground)]',
        });
      } else {
        throw new Error(result?.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save flashcard', err);
      toast.error('Could not save flashcard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] md:max-w-md md:mx-auto pb-[calc(24px+env(safe-area-inset-bottom,0px))] glass max-md:!rounded-b-none squircle-xl p-6 text-[var(--foreground)]"
          style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(32px)',
            borderTop: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div className="mb-4">
            <h2 className="brutal-heading text-2xl glow-cyan m-0">Save to Flashcards</h2>
          </div>
          <div className="flex flex-col space-y-3 mt-2">
            <div>
              <p className="micro-copy mb-2">PHRASE</p>
              <p className="text-xl font-black tracking-tighter text-[var(--foreground)]">{phrase}</p>
            </div>
            {contextSentence && contextSentence !== phrase && (
              <p className="text-sm text-[var(--foreground-muted)] italic border-l-2 border-[var(--border)] pl-3 glass squircle p-2">
                &quot;{contextSentence}&quot;
              </p>
            )}
            <div className="space-y-2">
              <p className="micro-copy">TRANSLATION</p>
              {loading ? (
                <div className="h-6 squircle glass overflow-hidden">
                  <motion.div
                    className="h-full w-1/2 bio-cyan"
                    animate={{ x: ['-50%', '150%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              ) : (
                <p className="text-base font-medium text-[var(--foreground)] min-h-[1.5rem]">
                  {translation || <span className="text-[var(--foreground-muted)] glow-fuchsia">NO TRANSLATION</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="micro-copy">EXPLANATION</p>
              {loading ? (
                <div className="h-12 squircle glass overflow-hidden">
                  <motion.div
                    className="h-full w-2/3 bio-fuchsia"
                    animate={{ x: ['-50%', '150%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              ) : (
                <p className="text-base font-medium text-[var(--foreground)] min-h-[3rem]">
                  {explanation || <span className="text-[var(--foreground-muted)] glow-lime">NO EXPLANATION</span>}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-400 glow-fuchsia squircle p-2 text-center">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <motion.button
                type="button"
                onClick={() => onOpenChange(false)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                transition={spring}
                className="px-4 py-2.5 squircle glass text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] dopamine-button"
              >
                CANCEL
              </motion.button>
              <motion.button
                type="button"
                onClick={handleAddFlashcard}
                disabled={saving || loading}
                whileTap={saving || loading ? undefined : { scale: 0.95 }}
                whileHover={saving || loading ? undefined : { scale: 1.02 }}
                transition={spring}
                className="px-6 py-2.5 bio-cyan squircle text-sm font-bold text-black shadow-[var(--shadow-glow-cyan)] disabled:opacity-30 disabled:cursor-not-allowed dopamine-button particle-burst success-burst"
              >
                {saving ? 'CAPTURING…' : 'SAVE TO DECK'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
