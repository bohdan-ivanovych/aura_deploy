'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback } from 'react';
import { BookOpen, X, Plus, Check, Loader2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { haptics } from '@/lib/utils/haptics';

interface GrammarExplainSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  sessionId?: string;
}

const GLASS = {
  background: 'rgba(14,16,28,0.94)',
  backdropFilter: 'blur(52px) saturate(220%)',
  WebkitBackdropFilter: 'blur(52px) saturate(220%)',
  border: '1px solid rgba(255,255,255,0.13)',
  boxShadow: '0 -2px 0 rgba(255,255,255,0.08) inset, 0 24px 64px rgba(0,0,0,0.65)',
} as const;

interface GrammarData {
  topic: string;
  explanation: string;
  examples: string[];
  tip: string;
}

export function GrammarExplainSheet({ isOpen, onClose, messageText, sessionId }: GrammarExplainSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GrammarData | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !messageText) return;
    setData(null); setError(null); setAdded(false);
    setLoading(true);

    const ctrl = new AbortController();
    fetch('/api/grammar-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: messageText }),
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then(d => {
        if (d.topic) setData(d);
        else setError('No grammar topic found in this message.');
      })
      .catch(e => { if (e.name !== 'AbortError') setError('Could not load explanation.'); })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [isOpen, messageText]);

  const handleAddToList = useCallback(async () => {
    if (!data || adding || added) return;
    setAdding(true);
    haptics.light();
    try {
      const res = await fetch('/api/learning-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'grammar',
          topic: data.topic,
          explanation: data.explanation,
          sessionId,
        }),
      });
      if (res.ok) {
        setAdded(true);
        haptics.success?.();
        toast.success('📚 Added to Learning List!', { description: `"${data.topic}" queued for review.` });
      } else {
        const d = await res.json();
        toast.error(d.error || 'Could not save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setAdding(false);
    }
  }, [data, adding, added, sessionId]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gx-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300]"
            style={{ backdropFilter: 'blur(14px) brightness(0.45)', WebkitBackdropFilter: 'blur(14px) brightness(0.45)', background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="gx-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.85 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.22 }}
            onDragEnd={(_, info) => { if (info.offset.y > 60 || info.velocity.y > 500) onClose(); }}
            className="fixed bottom-0 left-0 right-0 z-[301]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' } as any}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-3 mb-3 rounded-[24px] overflow-hidden" style={GLASS}>

              {/* Drag handle */}
              <div className="flex justify-center pt-3">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(0,212,212,0.22), rgba(124,58,237,0.22))', border: '1px solid rgba(0,212,212,0.3)' }}>
                  <Lightbulb className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Grammar Insight</p>
                  <p className="text-[14px] font-bold text-white/90 leading-tight">
                    {loading ? 'Analyzing…' : (data?.topic || 'Grammar Explanation')}
                  </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center active:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4 max-h-[55vh] overflow-y-auto no-scrollbar">
                {loading && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span className="text-[13px] text-white/40">Fetching grammar explanation…</span>
                  </div>
                )}



                {error && (
                  <div className="py-6 text-center">
                    <p className="text-[13px] text-white/40">{error}</p>
                  </div>
                )}

                {data && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="space-y-4"
                  >
                    {/* Explanation */}
                    <div className="p-4 rounded-2xl" style={{ background: 'rgba(0,212,212,0.08)', border: '1px solid rgba(0,212,212,0.18)' }}>
                      <p className="text-[11px] font-black uppercase tracking-widest text-cyan-400/70 mb-2">Explanation</p>
                      <p className="text-[14px] text-white/85 leading-relaxed">{data.explanation}</p>
                    </div>

                    {/* Examples */}
                    {data.examples?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-2.5">Examples</p>
                        <div className="space-y-2">
                          {data.examples.map((ex, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 mt-[6px] shrink-0" />
                              <p className="text-[13px] text-white/70 leading-snug italic">"{ex}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tip */}
                    {data.tip && (
                      <div className="p-3.5 rounded-2xl" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)' }}>
                        <p className="text-[11px] font-black uppercase tracking-widest text-purple-400/70 mb-1.5">💡 Pro Tip</p>
                        <p className="text-[13px] text-white/70 leading-relaxed">{data.tip}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Footer CTA */}
              {data && (
                <div className="px-5 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddToList}
                    disabled={adding || added}
                    className="w-full py-3.5 rounded-[16px] flex items-center justify-center gap-2.5 font-bold text-[14px] transition-all disabled:opacity-70"
                    style={{
                      background: added
                        ? 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(16,185,129,0.15))'
                        : 'linear-gradient(135deg, rgba(0,212,212,0.22), rgba(124,58,237,0.18))',
                      border: `1px solid ${added ? 'rgba(52,211,153,0.4)' : 'rgba(0,212,212,0.3)'}`,
                      color: added ? '#34d399' : '#00d4d4',
                    }}
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {adding ? 'Adding…' : added ? 'Added to Learning List!' : 'Add to Learning List'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
