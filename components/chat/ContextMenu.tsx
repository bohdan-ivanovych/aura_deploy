'use client';

import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Copy, Trash2, Volume2, Languages, HelpCircle, X, CheckCheck, CornerUpLeft, Edit3, Loader2 } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '@/lib/utils/haptics';

export interface MessageRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  isAI: boolean;
}

interface ContextMenuProps {
  isVisible: boolean;
  onClose: () => void;
  messageRect: MessageRect | null;
  message: { id: string; text: string; sender: 'USER' | 'AI' };
  metrics?: { vocabScore?: number; complexityScore?: number; fluencyScore?: number; grammarScore?: number; accuracyScore?: number } | null;
  voiceId?: string | null;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string, deleteForAI?: boolean) => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  onExplain?: (text: string) => void;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
}

const ACTIONS_MAX_H = 320; // max height of the actions panel in px
const REACTIONS = ['😍', '🔥', '🥺', '❤️', '☃️', '💻', '🎅'];
const EMOJI_BAR_H = 56; // height of the emoji pill
const GAP = 10;

function ActionRow({ icon, label, onClick, destructive = false, success = false, delay = 0, disabled = false, isDark = true }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  destructive?: boolean; success?: boolean; delay?: number; disabled?: boolean; isDark?: boolean;
}) {
  const hoverClass = isDark ? 'active:bg-white/10' : 'active:bg-black/5';
  const defaultText = isDark ? 'text-white/90' : 'text-black/85';
  const defaultIcon = isDark ? 'text-white/55' : 'text-black/50';

  return (
    <motion.button
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28, delay }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3.5 px-4 py-[13px] text-left transition-colors active:scale-[0.98] disabled:opacity-40 ${
        destructive ? (isDark ? 'active:bg-red-500/15' : 'active:bg-red-500/10') : hoverClass
      }`}
    >
      <span className={`shrink-0 ${destructive ? 'text-red-500' : success ? 'text-emerald-500' : defaultIcon}`}>{icon}</span>
      <span className={`text-[15px] font-[500] tracking-[0.01em] flex-1 ${destructive ? 'text-red-500' : success ? 'text-emerald-500' : defaultText}`}>{label}</span>
    </motion.button>
  );
}

import { useTheme } from '@/lib/contexts/theme-context';

export function ContextMenu({ isVisible, onClose, messageRect, message, metrics, voiceId, onEdit, onDelete, onCopy, onSpeak, onExplain, onReact, onReply }: ContextMenuProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sheetY = useMotionValue(0);

  useEffect(() => { setMounted(true); }, []);

  const isUser = message.sender === 'USER';

  const reset = useCallback(() => {
    setCopied(false); setIsSpeaking(false); setShowDeleteConfirm(false);
    setTranslation(null); setIsTranslating(false);
  }, []);

  const handleClose = useCallback(() => {
    haptics.light(); reset(); onClose();
  }, [reset, onClose]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.text);
    onCopy(message.text);
    setCopied(true);
    setTimeout(handleClose, 700);
  }, [message.text, onCopy, handleClose]);

  const handleSpeak = useCallback(async () => {
    if (isSpeaking) return;
    
    if (!('speechSynthesis' in window)) {
      return;
    }

    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.lang = 'en-US';
    
    utterance.onend = () => { setIsSpeaking(false); handleClose(); };
    utterance.onerror = () => { setIsSpeaking(false); handleClose(); };
    
    window.speechSynthesis.speak(utterance);
    onSpeak(message.text);
  }, [isSpeaking, message.text, onSpeak, handleClose]);

  const handleTranslate = useCallback(async () => {
    if (translation || isTranslating) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: message.text }) });
      const data = await res.json();
      setTranslation(data.translated || 'Translation unavailable.');
    } catch { setTranslation('Translation unavailable.'); }
    finally { setIsTranslating(false); }
  }, [translation, isTranslating, message.text]);

  // ── compute positions for emoji bar + action panel ──
  const getPositions = () => {
    if (!messageRect) return { emojiTop: 0, actionsTop: 0, left: 0, width: 0, emojiLeft: 0, emojiWidth: 0 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const panelW = Math.min(260, vw - 32);
    const emojiW = Math.min(vw - 24, 340);
    const actionsMaxH = ACTIONS_MAX_H; // approximate needed height

    // Horizontal positioning
    let left = messageRect.isAI ? messageRect.left : messageRect.right - panelW;
    left = Math.max(12, Math.min(left, vw - panelW - 12));

    let emojiLeft = left;
    emojiLeft = Math.max(12, Math.min(emojiLeft, vw - emojiW - 12));

    // Vertical positioning to absolutely prevent overlapping
    // Priority: Emojis ABOVE bubble, Actions BELOW bubble.
    let emojiTop = messageRect.top - EMOJI_BAR_H - GAP;
    let actionsTop = messageRect.bottom + GAP;

    const spaceAbove = messageRect.top;
    const spaceBelow = vh - messageRect.bottom;

    if (spaceBelow < actionsMaxH && spaceAbove > actionsMaxH + EMOJI_BAR_H + (GAP * 2)) {
      // Not enough space below, but plenty above -> Stack both above
      actionsTop = messageRect.top - actionsMaxH - GAP;
      emojiTop = actionsTop - EMOJI_BAR_H - GAP;
    } else if (spaceAbove < EMOJI_BAR_H + GAP * 2 && spaceBelow > actionsMaxH + EMOJI_BAR_H + (GAP * 2)) {
      // Not enough space above, but plenty below -> Stack both below
      emojiTop = messageRect.bottom + GAP;
      actionsTop = emojiTop + EMOJI_BAR_H + GAP;
    } else if (spaceBelow < actionsMaxH && spaceAbove < EMOJI_BAR_H + GAP * 2) {
      // Very constrained screen, center it vertically on screen without caring about message wrapper
      actionsTop = Math.max(60, (vh - actionsMaxH) / 2 + 30);
      emojiTop = actionsTop - EMOJI_BAR_H - GAP;
    }

    return { emojiTop, actionsTop, left, width: panelW, emojiLeft, emojiWidth: emojiW };
  };

  const glassStyle = {
    background: isDark ? 'rgba(26,27,38,0.85)' : 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(32px) saturate(180%)',
    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
    boxShadow: isDark 
      ? '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
      : '0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
  };

  const dividerStyle = {
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && messageRect && (() => {
        const { emojiTop, actionsTop, left, width, emojiLeft, emojiWidth } = getPositions();
        return (
          <>
            {/* Full-screen blurred backdrop */}
            <motion.div
              key="ctx-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[200]"
              style={{ backdropFilter: 'blur(16px) brightness(0.45)', WebkitBackdropFilter: 'blur(16px) brightness(0.45)', background: 'rgba(0,0,0,0.45)' }}
              onClick={handleClose}
            />

            {/* Visual Clone of the Message (Pops over backdrop) */}
            <motion.div
              key="ctx-clone"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1.025, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="fixed z-[205] pointer-events-none"
              style={{
                top: messageRect.top,
                left: messageRect.left,
                width: messageRect.width,
                height: messageRect.bottom - messageRect.top,
                background: messageRect.isAI ? 'var(--bubble-ai-bg)' : 'var(--bubble-user-bg)',
                border: `1px solid ${messageRect.isAI ? 'var(--bubble-ai-border)' : 'var(--bubble-user-border)'}`,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                borderRadius: messageRect.isAI ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                padding: '12px 16px',
                overflow: 'hidden',
              }}
            >
              <p className="text-[14px] leading-[1.65] font-medium tracking-[0.005em]" style={{ color: 'var(--foreground)' }}>
                {message.text}
              </p>
            </motion.div>


            {/* ── Emoji reactions bar — floats above the message ── */}
            <motion.div
              key="ctx-emoji"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.02 }}
              className="fixed z-[210] flex items-center justify-between px-2.5 py-2"
              style={{ top: emojiTop, left: emojiLeft, width: emojiWidth, ...glassStyle, borderRadius: 999 }}
              onClick={e => e.stopPropagation()}
            >
              {REACTIONS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.04 + i * 0.025 }}
                  whileTap={{ scale: 1.45 }}
                  onClick={() => { haptics.light(); if (onReact) onReact(emoji); handleClose(); }}
                  className={`text-[25px] w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isDark ? 'active:bg-white/10' : 'active:bg-black/5'}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>

            {/* ── Actions panel — floats below (or above) the message ── */}
            <motion.div
              key="ctx-panel"
              initial={{ opacity: 0, scale: 0.9, y: actionsTop < messageRect.top ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 460, damping: 30, delay: 0.04 }}
              className="fixed z-[210] overflow-hidden"
              style={{ top: actionsTop, left, width, ...glassStyle, borderRadius: 18 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Translation result */}
              <AnimatePresence>
                {(isTranslating || translation) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pt-3 pb-2" style={dividerStyle}>
                      <div className="flex items-center gap-2 mb-1">
                        <Languages className={`w-3 h-3 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-cyan-400/80' : 'text-blue-500/80'}`}>Translation</span>
                        <button onClick={() => setTranslation(null)} className="ml-auto">
                           <X className={`w-3 h-3 ${isDark ? 'text-white/30' : 'text-black/30'}`} />
                        </button>
                      </div>
                      {isTranslating
                        ? <div className="flex items-center gap-2 py-1"><Loader2 className={`w-3.5 h-3.5 animate-spin ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} /><span className={`text-[12px] ${isDark ? 'text-white/40' : 'text-black/40'} italic`}>Translating…</span></div>
                        : <p className={`text-[13px] leading-snug font-medium ${isDark ? 'text-white/80' : 'text-black/80'}`}>{translation}</p>
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Metrics (Vocab, Complexity, etc.) */}
              {metrics && (
                <div className="px-4 py-3 flex gap-4 overflow-x-auto no-scrollbar" style={dividerStyle}>
                  {[
                    { label: 'Vocab', value: metrics.vocabScore, color: '#f59e0b' },
                    { label: 'Comp', value: metrics.complexityScore, color: '#00d4d4' },
                    { label: 'Fluency', value: metrics.fluencyScore, color: '#a78bfa' },
                    { label: 'Grammar', value: metrics.grammarScore, color: '#f43f5e' },
                    { label: 'Acc', value: metrics.accuracyScore, color: '#3b82f6' },
                  ].map(({ label, value, color }) => value ? (
                    <div key={label} className="flex flex-col items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider`} style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{label}</span>
                      <span className="text-[14px] font-black" style={{ color }}>{value}</span>
                    </div>
                  ) : null)}
                </div>
              )}

              <div className="flex flex-col" style={{ 
                 // We apply borders between children using CSS adjacent sibling selector
                 // to adapt to light/dark mode without complex manual logic. 
                 // However, doing it programmatically is fine. 
              }}>
                {onReply && <ActionRow isDark={isDark} icon={<CornerUpLeft className="w-[17px] h-[17px]" />} label="Reply" onClick={() => { onReply?.(); handleClose(); }} delay={0} />}
                <ActionRow isDark={isDark} icon={copied ? <CheckCheck className="w-[17px] h-[17px]" /> : <Copy className="w-[17px] h-[17px]" />} label={copied ? 'Copied!' : 'Copy'} onClick={handleCopy} success={copied} delay={0.02} />
                <ActionRow isDark={isDark} icon={isSpeaking ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Volume2 className="w-[17px] h-[17px]" />} label={isSpeaking ? 'Playing…' : 'Listen'} onClick={handleSpeak} delay={0.04} disabled={isSpeaking} />
                <ActionRow
                  isDark={isDark}
                  icon={isTranslating ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Languages className="w-[17px] h-[17px]" />}
                  label={translation ? 'Translation shown' : 'Translate'} onClick={handleTranslate} delay={0.06} disabled={isTranslating || !!translation}
                />
                {!isUser && onExplain && <ActionRow isDark={isDark} icon={<HelpCircle className="w-[17px] h-[17px]" />} label="Explain grammar" onClick={() => { onExplain?.(message.text); handleClose(); }} delay={0.08} />}
                {isUser && <ActionRow isDark={isDark} icon={<Edit3 className="w-[17px] h-[17px]" />} label="Edit" onClick={() => { onEdit(message.id, message.text); handleClose(); }} delay={0.08} />}

                <div style={dividerStyle}></div>
                {!showDeleteConfirm
                  ? <ActionRow isDark={isDark} icon={<Trash2 className="w-[17px] h-[17px]" />} label="Delete" onClick={() => setShowDeleteConfirm(true)} destructive delay={0.1} />
                  : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2.5 space-y-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Delete for…</p>
                      <button onClick={() => { onDelete(message.id, false); handleClose(); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${isDark ? 'text-white/80 active:bg-white/10' : 'text-black/80 active:bg-black/5'}`}>Me only</button>
                      <button onClick={() => { onDelete(message.id, true); handleClose(); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors text-red-500 ${isDark ? 'active:bg-red-500/15' : 'active:bg-red-500/10'}`}>Everyone (removes context)</button>
                    </motion.div>
                }
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>,
    document.body
  );
}
