'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createDeck, updateDeck } from '@/app/actions/flashcard';
import { useTheme } from '@/lib/contexts/theme-context';
import { Loader2 } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const inputClass = "mt-1.5 w-full rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none transition-all";

export default function DeckFormModal({ 
  open, 
  onOpenChange, 
  editingDeck, 
  userId 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  editingDeck?: any;
  userId: string;
}) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingDeck) {
        setTitle(editingDeck.title);
        setDescription(editingDeck.description || '');
        setIsPublic(editingDeck.isPublic || false);
      } else {
        setTitle('');
        setDescription('');
        setIsPublic(false);
      }
    }
  }, [open, editingDeck]);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Deck name is required');
    setIsSubmitting(true);
    try {
      if (editingDeck) {
        await updateDeck(editingDeck.id, userId, { title, description, isPublic });
        toast.success('Deck updated');
      } else {
        await createDeck(userId, title, description, isPublic);
        toast.success('Deck created');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving deck');
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
            {editingDeck ? 'Edit Deck' : 'Create Deck'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          <div>
             <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
               Deck Title
             </label>
             <input
               className={inputClass}
               style={inputStyle}
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="e.g. IT Vocabulary"
             />
          </div>
          <div>
             <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
               Description (Optional)
             </label>
             <textarea
               className={inputClass + ' min-h-[88px] resize-none'}
               style={inputStyle}
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Describe this collection..."
             />
          </div>
          
          <div className="flex items-center gap-3 py-2">
            <input 
              type="checkbox" 
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#00d4d4] focus:ring-[#00d4d4]"
              style={{ accentColor: '#00d4d4' }}
            />
            <label htmlFor="isPublic" className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#1D1D1F' }}>
              Publish to Community Library
            </label>
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
              {editingDeck ? 'Save' : 'Create'}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
