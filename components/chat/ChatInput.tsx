'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic, MicOff, X, CornerUpLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { ReplyTarget } from './ChatMessage';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { haptics } from '@/lib/utils/haptics';
import { useChatUIStore } from '@/lib/stores/ui-store';

interface ChatInputProps {
  onSend: (text: string, replyToId?: string, isTikTok?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedSession?: { blockedBy?: string | null; persona?: { name: string } | null };
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  initialText?: string;
}

const BASE_PROMPTS = [
  (n: string) => `Message ${n}...`,
  (_n: string) => 'Try not to use basic words...',
  (_n: string) => 'Speak C1 or remain silent...',
  (n: string) => `Say something to ${n}...`,
  (_n: string) => 'Show me what you\'ve got...',
];

function getPersonaPrompts(personaName: string): string[] {
  return BASE_PROMPTS.map(fn => fn(personaName));
}

/** Returns true when the text contains a TikTok URL anywhere */
function detectTikTok(text: string): boolean {
  return /https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/\S+/i.test(text);
}

/** Extracts the first TikTok URL from the text, or null */
function extractTikTokUrl(text: string): string | null {
  const match = text.match(/https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/\S+/i);
  return match ? match[0].split('?')[0] : null;
}

function TypewriterPlaceholder({ text }: { text: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={text}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center pointer-events-none px-3 text-[14px] font-medium z-10"
        style={{ color: 'var(--foreground-subtle)' }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

export function ChatInput({
  onSend,
  disabled,
  placeholder,
  selectedSession,
  replyTo,
  onCancelReply,
  initialText,
}: ChatInputProps) {
  const [text, setText] = useState(initialText ?? '');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isPopupActive, setIsPopupActive] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isBlocked = selectedSession?.blockedBy != null;
  const setIsRecording = useChatUIStore(state => state.setIsRecording);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  const handleTranscript = useCallback((finalText: string) => {
    setText(prev => {
      const trimmed = prev.trimEnd();
      return trimmed ? trimmed + ' ' + finalText.trim() : finalText.trim();
    });
  }, []);

  const handleVoiceError = useCallback((msg: string) => {
    toast.error(msg, { duration: 4000 });
  }, []);

  const { status: voiceStatus, interimText, isSupported: voiceSupported, toggle: toggleVoice, stop: stopVoice, error: voiceError } = useSpeechInput({
    lang: 'en-US',
    continuous: true,
    interimResults: true,
    onTranscript: handleTranscript,
    onError: handleVoiceError,
  });

  const isListening = voiceStatus === 'listening';

  useEffect(() => {
    setIsRecording(isListening);
  }, [isListening, setIsRecording]);

  useEffect(() => {
    if (voiceError && voiceStatus === 'error') {
      toast.error(voiceError, { duration: 4000 });
    }
  }, [voiceError, voiceStatus]);

  const personaName = selectedSession?.persona?.name || 'AI';
  const personaPrompts = getPersonaPrompts(personaName);

  const showTypewriter = !disabled && !isBlocked && !replyTo && !text && !isListening;

  useEffect(() => {
    if (!showTypewriter) return;
    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % personaPrompts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [showTypewriter, personaPrompts.length]);

  const sendingRef = useRef(false);
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isBlocked || sendingRef.current) return;
    sendingRef.current = true;
    setTimeout(() => { sendingRef.current = false; }, 800);
    haptics.medium();
    if (isListening) stopVoice();
    const isTikTok = detectTikTok(trimmed);
    onSend(trimmed, replyTo?.id, isTikTok);
    setText('');
    haptics.light();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    onCancelReply?.();
  }, [text, disabled, isBlocked, isListening, stopVoice, onSend, replyTo, onCancelReply]);
  useEffect(() => {
    const handleOpen = () => setIsPopupActive(true);
    const handleClose = () => setIsPopupActive(false);
    window.addEventListener('word-popup-open', handleOpen);
    window.addEventListener('word-popup-close', handleClose);
    return () => {
      window.removeEventListener('word-popup-open', handleOpen);
      window.removeEventListener('word-popup-close', handleClose);
    };
  }, []);

  const handleMicClick = useCallback(() => {
    if (!voiceSupported) {
      toast.error('Speech recognition is not supported in this browser. Use Chrome or Edge.', { duration: 5000 });
      return;
    }
    if (disabled || isBlocked) return;
    haptics.light();
    toggleVoice();
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [voiceSupported, disabled, isBlocked, toggleVoice]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const canSend = !!text.trim() && !disabled && !isBlocked;

  const getStaticPlaceholder = () => {
    if (isBlocked) return 'This chat is blocked…';
    if (disabled) return `${personaName} is thinking…`;
    if (isListening) return '';
    if (replyTo) return `Reply to ${replyTo.sender === 'AI' ? 'AI' : 'yourself'}…`;
    return '';
  };

  const isTikTokUrl = detectTikTok(text);

  return (
    <div
      className={clsx(
        "chat-input-wrapper shrink-0 w-full pointer-events-none transition-all duration-300 ease-out",
        isPopupActive ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0',
        "pb-[calc(68px+max(12px,env(safe-area-inset-bottom,12px)))] md:pb-4"
      )}
      style={{
        paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
      }}
      suppressHydrationWarning
    >
      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 pointer-events-auto">

        {/* TikTok URL preview pill */}
        <AnimatePresence>
          {isTikTokUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="mb-2 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                style={{
                  background: 'rgba(244,63,94,0.06)',
                  border: '1px solid rgba(244,63,94,0.2)',
                  backdropFilter: 'blur(12px)',
                }}>
                <span className="text-base shrink-0">🎵</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#f43f5e' }}>TikTok Detected</p>
                  <p className="text-[12px] text-[var(--foreground-muted)] truncate">{extractTikTokUrl(text) || text.trim()}</p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] shrink-0 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
                  Note incoming
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply preview bar */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="mb-2 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl liquid-glass border-l-2"
                style={{ borderLeftColor: 'var(--accent-cyan)' }}>
                <CornerUpLeft className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em]"
                    style={{ color: 'var(--accent-cyan)' }}>
                    Replying to {replyTo.sender === 'USER' ? 'yourself' : 'AI'}
                  </p>
                  <p className="text-[12px] text-[var(--foreground-muted)] truncate">
                    {replyTo.text.slice(0, 100)}{replyTo.text.length > 100 ? '…' : ''}
                  </p>
                </div>
                <button onClick={onCancelReply}
                  className="p-1 rounded-full hover:bg-[var(--surface-hover)] transition-colors shrink-0">
                  <X className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice interim preview */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="mb-2 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  backdropFilter: 'blur(12px)',
                }}>
                {/* Waveform animation */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="w-0.5 rounded-full"
                      style={{ background: '#ef4444' }}
                      animate={{
                        height: interimText
                          ? ['4px', `${6 + Math.sin(i * 1.2) * 8}px`, '4px']
                          : ['4px', '8px', '4px']
                      }}
                      transition={{ duration: 0.5 + i * 0.08, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }}
                    />
                  ))}
                </div>
                <p className="text-[12px] font-medium flex-1 min-w-0"
                  style={{ color: interimText ? 'var(--foreground-muted)' : 'rgba(239,68,68,0.6)', fontStyle: interimText ? 'normal' : 'italic' }}>
                  {interimText || 'Listening…'}
                </p>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] shrink-0"
                  style={{ color: 'rgba(239,68,68,0.5)' }}>
                  LIVE
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={false}
          className="relative"
          animate={{
            scale: isFocused && !isListening ? 1.02 : 1, // Fluid swelling
          }}
          transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.8 }}
        >


          {/* Active voice border glow */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                className="absolute -inset-px rounded-[38px] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background: 'transparent',
                  boxShadow: '0 0 0 1.5px rgba(239,68,68,0.5), 0 0 20px rgba(239,68,68,0.22)',
                }}
              />
            )}
          </AnimatePresence>

          <div
            className={clsx(
              'relative flex items-center gap-2 px-2 py-[5px] transition-all overflow-hidden',
              isBlocked && 'opacity-60 pointer-events-none'
            )}
            style={{
              borderRadius: '28px', // large capsule radius
              transitionDuration: '400ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              background: isListening
                ? 'rgba(239,68,68,0.06)'
                : isFocused
                  ? 'var(--surface-active)'
                  : 'var(--surface)',
              isolation: 'isolate',
              contain: 'paint',
              border: isListening
                ? '1px solid rgba(239,68,68,0.3)'
                : isFocused
                  ? '1px solid var(--border)'
                  : '1px solid var(--border-subtle)',
              boxShadow: isListening
                ? '0 8px 32px rgba(239,68,68,0.15)'
                : isFocused
                  ? '0 16px 40px rgba(0,0,0,0.6)'
                  : '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Top shimmer light — simulates glass refraction */}
            <div
              className="absolute top-0 left-6 right-6 h-px pointer-events-none"
              style={{
                background: 'var(--nav-highlight)',
                opacity: isFocused ? 1 : 0.4,
                transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms',
                transform: isFocused ? 'scaleX(1.1)' : 'scaleX(1)',
                boxShadow: isFocused ? '0 1px 8px var(--border)' : 'none',
              }}
            />
            {/* Mic button — left of input */}
            <motion.button
              onClick={handleMicClick}
              whileTap={{ scale: 0.82 }}
              whileHover={!isListening ? { scale: 1.08 } : {}}
              disabled={disabled || isBlocked}
              title={
                !voiceSupported ? 'Voice not supported in this browser'
                  : isListening ? 'Stop recording'
                    : 'Start voice input'
              }
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm',
                isListening
                  ? 'text-white'
                  : 'bg-[var(--surface-active)] hover:bg-[var(--surface-hover)]',
                (disabled || isBlocked) && 'opacity-40 cursor-not-allowed',
              )}
              style={!isListening ? { color: 'var(--foreground-muted)' } : undefined}
              animate={isListening
                ? { backgroundColor: ['#ef4444', '#dc2626', '#ef4444'], scale: [1, 1.05, 1] }
                : { backgroundColor: 'transparent', scale: 1 }
              }
              transition={isListening
                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
              }
            >
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.div key="mic-off"
                    initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 15 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
                    <MicOff className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div key="mic-on"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
                    <Mic className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="relative flex-1 min-w-0">
              {showTypewriter && <TypewriterPlaceholder text={personaPrompts[placeholderIndex % personaPrompts.length]} />}
              {(isBlocked || disabled || replyTo) && !text && !isListening && (
                <span className="absolute inset-0 flex items-center pointer-events-none px-3 text-[14px] font-medium z-10"
                  style={{ color: 'var(--foreground-subtle)' }}>
                  {getStaticPlaceholder()}
                </span>
              )}
              {isListening && !text && !interimText && (
                <span className="absolute inset-0 flex items-center pointer-events-none px-3 text-[14px] font-medium italic z-10"
                  style={{ color: 'rgba(239,68,68,0.4)' }}>
                  Tap mic to stop…
                </span>
              )}
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  if (e.key === 'Escape' && replyTo && onCancelReply) onCancelReply();
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setTimeout(() => {
                    document.querySelector('[data-messages-end]')?.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder || ''}
                disabled={disabled || isBlocked}
                inputMode="text"
                enterKeyHint="send"
                className="w-full bg-transparent border-none text-[var(--foreground)] placeholder:text-transparent outline-none focus:outline-none focus-visible:outline-none resize-none py-2.5 px-3 leading-6 max-h-36 no-scrollbar font-medium relative z-20 touch-manipulation select-text"
                style={{ minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '16px' }}
              />
            </div>

            {/* Send button — right of input */}
            <div className="flex items-center shrink-0">
              <AnimatePresence>
                {canSend && (
                  <motion.button
                    key="send"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, boxShadow: '0 4px 12px rgba(0,212,212,0.3)' }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.08 }}
                    onClick={handleSend}
                    className="w-10 h-10 mr-0.5 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-quaternary)] text-black shadow-lg"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[3px]" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {text.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] font-medium text-[var(--foreground-subtle)] text-right mt-1 pr-2 tracking-wide"
            >
              <span className="hidden md:inline">{text.length} · ↵ send · ⇧↵ newline</span>
              <span className="md:hidden">{text.length} chars</span>
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
