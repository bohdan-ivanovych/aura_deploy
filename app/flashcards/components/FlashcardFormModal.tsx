'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createFlashcard, updateFlashcard } from '@/app/actions/flashcard';
import { useTheme } from '@/lib/contexts/theme-context';
import { Sparkles, Loader2 } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const inputClass = "mt-1.5 w-full rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none transition-all";

export default function FlashcardFormModal({ 
  open, 
  onOpenChange, 
  deckId, 
  editingCard, 
  userId 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  deckId: string | null;
  editingCard?: any;
  userId: string;
}) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [lastSuggestedBack, setLastSuggestedBack] = useState('');
  
  // Debounce for autosuggest with AbortController to cancel stale requests
  useEffect(() => {
    if (editingCard) return; // Don't autosuggest while editing
    if (!front || front.trim().length < 2) {
      setIsSuggesting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      // Only suggest if back is empty or was previously auto-suggested
      if (back.trim() !== '' && back !== lastSuggestedBack) return;
      
      setIsSuggesting(true);
      try {
        const res = await fetch('/api/flashcards/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: front }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.suggestion) {
          if (!back || back === lastSuggestedBack) {
            setBack(data.suggestion.back || '');
            setLastSuggestedBack(data.suggestion.back || '');
          }
          // Only overwrite explanation if it's still empty
          if (!explanation.trim()) setExplanation(data.suggestion.englishExplanation || '');
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Silent fail for suggestions (only log non-abort errors)
        }
      } finally {
        if (!controller.signal.aborted) setIsSuggesting(false);
      }
    }, 700); // 700ms debounce

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      setIsSuggesting(false);
    };
  }, [front]);

  useEffect(() => {
    if (open) {
      if (editingCard) {
        setFront(editingCard.front);
        setBack(editingCard.back || '');
        setExplanation(editingCard.englishExplanation || '');
      } else {
        setFront('');
        setBack('');
        setExplanation('');
        setLastSuggestedBack('');
      }
    }
  }, [open, editingCard]);

  const handleSubmit = async () => {
    if (!front.trim()) return toast.error('Term is required');
    setIsSubmitting(true);
    try {
      if (editingCard) {
        await updateFlashcard(editingCard.id, userId, { front, back, englishExplanation: explanation });
        toast.success('Card updated');
      } else {
        await createFlashcard(userId, front, back, 'translation', null, explanation, deckId);
        toast.success('Card created');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving card');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
    color: isDark ? '#ffffff' : '#1D1D1F',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{
          background: isDark ? 'rgba(8,8,12,0.97)' : '#fff',
          backdropFilter: 'blur(40px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
          boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.10)' : '0 24px 60px rgba(0,0,0,0.14)',
          color: isDark ? '#fff' : '#1D1D1F',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: isDark ? '#fff' : '#1D1D1F', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {editingCard ? 'Edit Flashcard' : 'Create Flashcard'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          <div>
             <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
               Term / Word
             </label>
             <input
               className={inputClass}
               style={inputStyle}
               value={front}
               onChange={(e) => setFront(e.target.value)}
               placeholder="e.g. Serendipity"
             />
          </div>
          <div className="relative">
             <div className="flex items-center justify-between">
               <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
                 Definition / Translation
               </label>
               {isSuggesting && (
                 <span className="text-[9px] font-bold uppercase flex items-center gap-1 text-[#00d4d4] animate-pulse">
                   <Sparkles className="w-3 h-3" /> Aura Suggesting...
                 </span>
               )}
             </div>
             <input
               className={inputClass}
               style={{...inputStyle, transition: 'border-color 0.3s', borderColor: isSuggesting ? '#00d4d4' : inputStyle.border.split(' ')[2]}}
               value={back}
               onChange={(e) => setBack(e.target.value)}
             />
          </div>
          <div>
             <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
               English explanation (Optional)
             </label>
             <textarea
               className={inputClass + ' min-h-[88px] resize-none'}
               style={inputStyle}
               value={explanation}
               onChange={(e) => setExplanation(e.target.value)}
             />
          </div>
          
          <div className="flex justify-end gap-2 pt-1">
            <motion.button
              type="button" onClick={() => onOpenChange(false)}
              whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} transition={SPRING}
              className="px-4 py-2.5 rounded-2xl text-sm font-semibold"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
                color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
              }}>
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(0,212,212,0.4)' }} transition={SPRING}
              className="px-4 py-2.5 rounded-2xl text-sm font-black text-black flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                boxShadow: '0 4px 20px rgba(0,212,212,0.35)',
                opacity: isSubmitting ? 0.7 : 1,
              }}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingCard ? 'Save' : 'Create'}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
