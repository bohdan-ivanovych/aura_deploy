'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, Save, Plus, Trash2, GripVertical, Import, ArrowRightLeft, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/theme-context';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

interface CardEntry {
  id: string;
  front: string;
  back: string;
}

function createEmptyCard(): CardEntry {
  return { id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, front: '', back: '' };
}

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateDeckModal({ isOpen, onClose, onSuccess }: CreateDeckModalProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<CardEntry[]>(() => [createEmptyCard(), createEmptyCard()]);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [separator, setSeparator] = useState<'tab' | 'comma'>('tab');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setCards([createEmptyCard(), createEmptyCard()]);
      setShowImport(false);
      setImportText('');
    }
  }, [isOpen]);

  const addCard = useCallback(() => {
    setCards(prev => [...prev, createEmptyCard()]);
    // Scroll to bottom after add
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards(prev => {
      if (prev.length <= 1) return prev; // Keep at least 1
      return prev.filter(c => c.id !== id);
    });
  }, []);

  const updateCard = useCallback((id: string, field: 'front' | 'back', value: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const handleImportParse = () => {
    if (!importText.trim()) return [];
    const lines = importText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: CardEntry[] = [];
    const sepChar = separator === 'tab' ? '\t' : ',';
    for (const line of lines) {
      const parts = line.split(sepChar);
      if (parts.length >= 2) {
        const front = parts[0].trim();
        const back = parts.slice(1).join(sepChar).trim();
        if (front && back) {
          parsed.push({ id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, front, back });
        }
      }
    }
    return parsed;
  };

  const applyImport = () => {
    const parsed = handleImportParse();
    if (parsed.length === 0) {
      toast.error('No cards parsed. Check your separator.');
      return;
    }
    // Replace empty cards, append parsed
    setCards(prev => {
      const nonEmpty = prev.filter(c => c.front.trim() || c.back.trim());
      return [...nonEmpty, ...parsed];
    });
    setShowImport(false);
    setImportText('');
    toast.success(`${parsed.length} cards imported`);
  };

  const filledCards = cards.filter(c => c.front.trim() && c.back.trim());

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Add a title for your deck');
      return;
    }
    if (filledCards.length === 0) {
      toast.error('Add at least one card with both term and definition');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/flashcards/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          cards: filledCards.map(c => ({ front: c.front.trim(), back: c.back.trim() })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create deck');
      const data = await res.json();

      toast.success(`Deck created with ${filledCards.length} cards!`);
      if (onSuccess) onSuccess();
      if (data.deck?.id) router.push(`/flashcards/${data.deck.id}`);
      onClose();
    } catch {
      toast.error('Failed to create deck');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ── Shared styles ──
  const glassCard = {
    background: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
    borderRadius: '20px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const inputStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: 'none',
    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '0',
    color: isDark ? '#fff' : '#1D1D1F',
    outline: 'none',
    fontSize: '15px',
    fontWeight: 500,
    padding: '12px 0 8px 0',
    width: '100%',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
    marginTop: '4px',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center p-0 md:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={SPRING}
          className="relative w-full md:max-w-2xl flex flex-col md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
          style={{
            height: '92vh',
            maxHeight: '92vh',
            background: isDark ? 'rgba(12,14,20,0.96)' : 'rgba(248,249,250,0.98)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)', boxShadow: '0 0 16px rgba(0,212,212,0.3)' }}>
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>
                Create a new flashcard set
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2 rounded-xl text-[12px] font-black text-black uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                  opacity: isSubmitting || !title.trim() ? 0.5 : 1,
                  boxShadow: '0 4px 16px rgba(0,212,212,0.3)',
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </motion.button>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] transition-colors">
                <X className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
              </button>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 md:px-8 py-6 space-y-5 no-scrollbar">
            {/* Title + Description */}
            <div style={{...glassCard, padding: '20px 24px'}}>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter a title, like &quot;Biology — Chapter 22: Evolution&quot;"
                className="placeholder:text-[var(--foreground-muted)]"
                style={{...inputStyle, fontSize: '17px', fontWeight: 700}}
                onFocus={e => (e.target.style.borderBottomColor = '#00d4d4')}
                onBlur={e => (e.target.style.borderBottomColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}
              />
              <p style={labelStyle}>Title</p>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="placeholder:text-[var(--foreground-muted)] mt-4"
                style={inputStyle}
                onFocus={e => (e.target.style.borderBottomColor = '#00d4d4')}
                onBlur={e => (e.target.style.borderBottomColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}
              />
              <p style={labelStyle}>Description</p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowImport(!showImport)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors"
                style={{
                  background: showImport ? (isDark ? 'rgba(0,212,212,0.12)' : 'rgba(0,212,212,0.08)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  border: `1px solid ${showImport ? 'rgba(0,212,212,0.3)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  color: showImport ? '#00d4d4' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'),
                }}
              >
                <Import className="w-3.5 h-3.5" />
                Import
              </motion.button>

              <div className="flex-1" />

              <span className="text-[11px] font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                {filledCards.length} / {cards.length} cards filled
              </span>
            </div>

            {/* Import Panel */}
            <AnimatePresence>
              {showImport && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div style={{ ...glassCard, padding: '20px 24px' }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-widest"
                        style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
                        Paste your data
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                          Between term and definition:
                        </span>
                        <select
                          value={separator}
                          onChange={e => setSeparator(e.target.value as 'tab' | 'comma')}
                          className="text-xs rounded-lg px-2 py-1 outline-none"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            color: isDark ? '#fff' : '#1D1D1F',
                          }}
                        >
                          <option value="tab">Tab</option>
                          <option value="comma">Comma</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={"term1\tdefinition1\nterm2\tdefinition2"}
                      className="w-full rounded-xl p-4 text-sm outline-none resize-none font-mono placeholder:text-[var(--foreground-muted)]"
                      style={{
                        minHeight: '140px',
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        color: isDark ? '#fff' : '#1D1D1F',
                      }}
                    />
                    <div className="flex items-center justify-between">
                      {importText.trim() ? (
                        <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#00d4d4' }}>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          {handleImportParse().length} cards detected
                        </p>
                      ) : <span />}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={applyImport}
                        disabled={!importText.trim() || handleImportParse().length === 0}
                        className="px-4 py-2 rounded-xl text-[11px] font-black text-black uppercase tracking-wider disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #00d4d4, #0098db)' }}
                      >
                        Import Cards
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Card List (Quizlet-style) ── */}
            <div className="space-y-4">
              {cards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={SPRING}
                  style={{ ...glassCard, padding: '0' }}
                  className="group"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <span className="text-[13px] font-black" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeCard(card.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Delete card"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Card inputs — side by side like Quizlet */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-0 px-5 pb-5">
                    <div
                      className="pr-0 sm:pr-4 sm:border-r"
                      style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
                    >
                      <input
                        type="text"
                        value={card.front}
                        onChange={e => updateCard(card.id, 'front', e.target.value)}
                        placeholder="Enter term"
                        className="placeholder:text-[var(--foreground-muted)]"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderBottomColor = '#00d4d4')}
                        onBlur={e => (e.target.style.borderBottomColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}
                      />
                      <p style={labelStyle}>Term</p>
                    </div>
                    <div className="pl-0 sm:pl-4 mt-3 sm:mt-0">
                      <input
                        type="text"
                        value={card.back}
                        onChange={e => updateCard(card.id, 'back', e.target.value)}
                        placeholder="Enter definition"
                        className="placeholder:text-[var(--foreground-muted)]"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderBottomColor = '#00d4d4')}
                        onBlur={e => (e.target.style.borderBottomColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}
                      />
                      <p style={labelStyle}>Definition</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add Card Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              onClick={addCard}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
              style={{
                ...glassCard,
                borderStyle: 'dashed',
                cursor: 'pointer',
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-bold">Add a card</span>
            </motion.button>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 px-5 py-4 flex items-center justify-between gap-3"
            style={{
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(20px)',
            }}>
            <span className="text-[11px] font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }}>
              {filledCards.length} {filledCards.length === 1 ? 'card' : 'cards'} ready
            </span>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-[12px] font-bold"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSubmitting || !title.trim() || filledCards.length === 0}
                className="px-6 py-2.5 rounded-xl text-[12px] font-black text-black"
                style={{
                  background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                  opacity: isSubmitting || !title.trim() || filledCards.length === 0 ? 0.5 : 1,
                  boxShadow: '0 4px 20px rgba(0,212,212,0.35)',
                }}
              >
                {isSubmitting ? 'Creating...' : `Create ${filledCards.length > 0 ? `(${filledCards.length})` : ''}`}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
