'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from '@/app/actions/onboarding';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

/* ─── Language data ─────────────────────────────────────────────────────── */

const TOP_LANGUAGES = [
  { code: 'uk', flag: '🇺🇦', name: 'Ukrainian' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese' },
];

const ALL_LANGUAGES = [
  { code: 'uk', flag: '🇺🇦', name: 'Ukrainian' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian' },
  { code: 'pl', flag: '🇵🇱', name: 'Polish' },
  { code: 'it', flag: '🇮🇹', name: 'Italian' },
  { code: 'tr', flag: '🇹🇷', name: 'Turkish' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean' },
  { code: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
  { code: 'nl', flag: '🇳🇱', name: 'Dutch' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi' },
  { code: 'bn', flag: '🇧🇩', name: 'Bengali' },
  { code: 'ro', flag: '🇷🇴', name: 'Romanian' },
  { code: 'sv', flag: '🇸🇪', name: 'Swedish' },
  { code: 'no', flag: '🇳🇴', name: 'Norwegian' },
  { code: 'da', flag: '🇩🇰', name: 'Danish' },
  { code: 'fi', flag: '🇫🇮', name: 'Finnish' },
  { code: 'cs', flag: '🇨🇿', name: 'Czech' },
  { code: 'sk', flag: '🇸🇰', name: 'Slovak' },
  { code: 'hu', flag: '🇭🇺', name: 'Hungarian' },
  { code: 'el', flag: '🇬🇷', name: 'Greek' },
  { code: 'he', flag: '🇮🇱', name: 'Hebrew' },
  { code: 'fa', flag: '🇮🇷', name: 'Persian' },
  { code: 'id', flag: '🇮🇩', name: 'Indonesian' },
  { code: 'ms', flag: '🇲🇾', name: 'Malay' },
  { code: 'th', flag: '🇹🇭', name: 'Thai' },
  { code: 'tl', flag: '🇵🇭', name: 'Filipino' },
  { code: 'kk', flag: '🇰🇿', name: 'Kazakh' },
  { code: 'uz', flag: '🇺🇿', name: 'Uzbek' },
  { code: 'az', flag: '🇦🇿', name: 'Azerbaijani' },
  { code: 'ka', flag: '🇬🇪', name: 'Georgian' },
  { code: 'hy', flag: '🇦🇲', name: 'Armenian' },
  { code: 'be', flag: '🇧🇾', name: 'Belarusian' },
  { code: 'bg', flag: '🇧🇬', name: 'Bulgarian' },
  { code: 'hr', flag: '🇭🇷', name: 'Croatian' },
  { code: 'sr', flag: '🇷🇸', name: 'Serbian' },
  { code: 'sl', flag: '🇸🇮', name: 'Slovenian' },
  { code: 'sq', flag: '🇦🇱', name: 'Albanian' },
  { code: 'lt', flag: '🇱🇹', name: 'Lithuanian' },
  { code: 'lv', flag: '🇱🇻', name: 'Latvian' },
  { code: 'et', flag: '🇪🇪', name: 'Estonian' },
  { code: 'mn', flag: '🇲🇳', name: 'Mongolian' },
  { code: 'ur', flag: '🇵🇰', name: 'Urdu' },
  { code: 'ta', flag: '🇮🇳', name: 'Tamil' },
  { code: 'te', flag: '🇮🇳', name: 'Telugu' },
  { code: 'ml', flag: '🇮🇳', name: 'Malayalam' },
  { code: 'ne', flag: '🇳🇵', name: 'Nepali' },
  { code: 'si', flag: '🇱🇰', name: 'Sinhala' },
  { code: 'my', flag: '🇲🇲', name: 'Burmese' },
  { code: 'km', flag: '🇰🇭', name: 'Khmer' },
  { code: 'sw', flag: '🇰🇪', name: 'Swahili' },
].sort((a, b) => a.name.localeCompare(b.name));

function buildLanguageGrid(detectedCode: string | null) {
  const topCodes = new Set(TOP_LANGUAGES.map(l => l.code));
  if (detectedCode && !topCodes.has(detectedCode)) {
    const detected = ALL_LANGUAGES.find(l => l.code === detectedCode)
      || { code: detectedCode, flag: '🌐', name: detectedCode.toUpperCase() };
    return [detected, ...TOP_LANGUAGES.slice(0, 6)];
  }
  if (detectedCode && topCodes.has(detectedCode)) {
    const detected = TOP_LANGUAGES.find(l => l.code === detectedCode)!;
    return [detected, ...TOP_LANGUAGES.filter(l => l.code !== detectedCode)];
  }
  return [...TOP_LANGUAGES];
}

/* ─── Module-level guard: survives StrictMode double-mount ───────────────── */
// Using a module-level variable ensures the greeting fires only once
// across React StrictMode's intentional double-mount in development.
let _greetingStarted = false;

/* ─── Chat bubble components ─────────────────────────────────────────────── */

function AuraAvatar() {
  return (
    <motion.div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,212,0.22), rgba(0,152,219,0.18))',
        border: '1px solid rgba(0,212,212,0.45)',
        color: '#00d4d4',
      }}
      animate={{
        boxShadow: [
          '0 0 8px rgba(0,212,212,0.35), 0 0 0px rgba(0,212,212,0)',
          '0 0 22px rgba(0,212,212,0.85), 0 0 40px rgba(0,152,219,0.35)',
          '0 0 8px rgba(0,212,212,0.35), 0 0 0px rgba(0,212,212,0)',
        ],
      }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      A
    </motion.div>
  );
}

function AIBubble({ text, isLast }: { text: string; isLast: boolean }) {
  return (
    <div className="flex items-end gap-2.5 w-full">
      {/* Avatar: visible only on the last bubble in an AI group */}
      {isLast ? <AuraAvatar /> : <div className="w-8 shrink-0" />}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="max-w-[78%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end w-full">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="max-w-[72%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
        style={{
          background: 'rgba(0,212,212,0.13)',
          border: '1px solid rgba(0,212,212,0.25)',
          color: 'var(--foreground)',
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2.5 w-full"
    >
      <AuraAvatar />
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--foreground-muted)' }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Step types ─────────────────────────────────────────────────────────── */

type Step = 'greeting' | 'name-input' | 'language' | 'done';

type ChatEntry =
  | { kind: 'ai'; text: string }
  | { kind: 'user'; text: string };

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding: markDone } = useOnboardingStore();

  const [step, setStep] = useState<Step>('greeting');
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showOtherPicker, setShowOtherPicker] = useState(false);

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [otherSearch, setOtherSearch] = useState('');

  // Keep a ref in sync with name state for safe use inside async closures
  const handleNameChange = (val: string) => { setName(val); nameRef.current = val; };

  const nameInputRef = useRef<HTMLInputElement>(null);
  const otherSearchRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  // Capture name in a ref so async handlers always read the latest value
  const nameRef = useRef('');

  const languageGrid = buildLanguageGrid(detectedLang);

  // Detect language in background
  useEffect(() => {
    fetch('/api/detect-language')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.detected) setDetectedLang(data.detected); })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chatLog, showTyping, showNameInput, showLangPicker]);

  // Also scroll when indicator disappears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [showTyping, showNameInput, showLangPicker]);

  const push = useCallback((entry: ChatEntry) => {
    setChatLog(prev => [...prev, entry]);
  }, []);

  const showAIWithDelay = useCallback((text: string, typingMs = 700): Promise<void> => {
    return new Promise(resolve => {
      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
        push({ kind: 'ai', text });
        setTimeout(resolve, 80);
      }, typingMs);
    });
  }, [push]);

  // Launch greeting sequence — module-level flag prevents StrictMode double-fire
  useEffect(() => {
    if (_greetingStarted) return;
    _greetingStarted = true;

    async function run() {
      push({ kind: 'ai', text: 'Hey! I\'m Aura — your personal AI companion for mastering English. I adapt to your level and style, so let\'s get to know each other first.' });
      await new Promise(r => setTimeout(r, 500));
      await showAIWithDelay('What\'s your name?', 600);
      setShowNameInput(true);
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
    void run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNameSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setShowNameInput(false);
    push({ kind: 'user', text: trimmed });
    setStep('language');
    await new Promise(r => setTimeout(r, 200));
    await showAIWithDelay(`Nice to meet you, ${trimmed.split(' ')[0]}! 👋 What's your native language?`, 800);
    setShowLangPicker(true);
  };

  const handleLangSelect = async (langCode: string) => {
    if (submitting) return;
    if (langCode === 'other') {
      setShowOtherPicker(true);
      setTimeout(() => otherSearchRef.current?.focus(), 200);
      return;
    }

    setSubmitting(true);
    setSelectedLang(langCode);
    setShowLangPicker(false);
    setShowOtherPicker(false);

    const langName = [...TOP_LANGUAGES, ...ALL_LANGUAGES].find(l => l.code === langCode)?.name ?? langCode;
    // Use the ref — guaranteed fresh even if called inside async chain
    const finalName = nameRef.current.trim() || name.trim() || 'User';

    push({ kind: 'user', text: langName });

    localStorage.setItem('onboardingLang', langCode);
    localStorage.setItem('onboardingName', finalName);
    localStorage.setItem('aura_onboarding_done', 'true');
    markDone();

    try {
      await completeOnboarding(finalName, langCode);
    } catch (err) {
      setSubmitting(false);
      localStorage.removeItem('aura_onboarding_done');
      push({ kind: 'ai', text: 'Oops, something went wrong saving your profile! Let\'s try that again.' });
      return;
    }

    await fetch('/api/chat-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(r => r.json()).then(data => {
      if (data?.session?.id) localStorage.setItem('lastSelectedSessionId', data.session.id);
    }).catch(() => {});

    // Show onboarding explanation for Magic Word before redirecting!
    await showAIWithDelay(`Perfect! I've set your translation language to ${langName}.`, 700);
    await showAIWithDelay(`💡 Quick tip: In our chat, you can TAP ANY WORD in my messages to see its translation or hear it read aloud! Try it once we start.`, 1600);
    await new Promise(r => setTimeout(r, 4500));

    setStep('done');
    // picker=true auto-opens PersonaStudio in ChatClient
    // Force a full hydration reload to clear cached "Diver" name in context
    window.location.href = '/chat?onboarding=true&picker=true';
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    const finalName = nameRef.current.trim() || name.trim() || 'User';
    localStorage.setItem('aura_onboarding_done', 'true');
    markDone();
    try {
      await completeOnboarding(finalName, detectedLang || 'uk');
    } catch (err) {
      setSubmitting(false);
      localStorage.removeItem('aura_onboarding_done');
      push({ kind: 'ai', text: 'Oops, something went wrong saving your profile! Let\'s try that again.' });
      return;
    }

    await fetch('/api/chat-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(r => r.json()).then(data => {
      if (data?.session?.id) localStorage.setItem('lastSelectedSessionId', data.session.id);
    }).catch(() => {});
    window.location.href = '/chat?onboarding=true&picker=true';
  };

  const filteredOther = otherSearch.trim()
    ? ALL_LANGUAGES.filter(l => l.name.toLowerCase().includes(otherSearch.toLowerCase()))
    : ALL_LANGUAGES;

  // For avatar: show it only on the LAST AI bubble in each AI-group
  const isLastInAIGroup = (i: number) => {
    // true if this is AI and the next entry is NOT AI (or it's the last entry)
    return chatLog[i].kind === 'ai' && (i === chatLog.length - 1 || chatLog[i + 1]?.kind !== 'ai');
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--background)', zIndex: 100 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,212,212,0.05) 0%, transparent 70%)',
      }} />

      {/* Skip button — positioned below the notch */}
      {step !== 'done' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={handleSkip}
          disabled={submitting}
          className="fixed right-4 px-4 py-2 rounded-xl text-xs font-semibold z-50 disabled:opacity-40"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 52px)',
            color: 'var(--foreground-muted)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          Skip
        </motion.button>
      )}

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{
          // Push content below notch + give room for the skip button
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 7.5rem)',
          paddingBottom: '1rem',
        }}
      >
        {/* Left-aligned column, max width, centred in viewport */}
        <div className="w-full max-w-sm md:max-w-lg mx-auto px-4 flex flex-col gap-3">

          <AnimatePresence initial={false}>
            {chatLog.map((entry, i) =>
              entry.kind === 'ai' ? (
                <AIBubble
                  key={i}
                  text={entry.text}
                  isLast={isLastInAIGroup(i)}
                />
              ) : (
                <UserBubble key={i} text={entry.text} />
              )
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {showTyping && <TypingIndicator />}
          </AnimatePresence>

          {/* Name input */}
          <AnimatePresence>
            {showNameInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="flex flex-col gap-2.5 pl-[2.6rem]"
              >
                {/* Liquid Glass input */}
                <div
                  className="relative rounded-[28px] transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 28px rgba(0,0,0,0.35)',
                  }}
                >
                  {/* top shimmer highlight */}
                  <div
                    className="absolute top-0 left-4 right-4 h-px rounded-full pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }}
                  />
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void handleNameSubmit(); }}
                    placeholder="Type your name…"
                    inputMode="text"
                    enterKeyHint="done"
                    maxLength={50}
                    className="w-full px-5 py-3.5 bg-transparent outline-none touch-manipulation placeholder:text-[var(--foreground-muted)]"
                    style={{
                      color: 'var(--foreground)',
                      fontSize: '16px',
                      borderRadius: '28px',
                    }}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void handleNameSubmit()}
                  disabled={!name.trim()}
                  className="relative w-full py-3.5 rounded-[28px] text-sm font-black uppercase tracking-[0.12em] touch-manipulation overflow-hidden disabled:opacity-35"
                  style={{
                    background: name.trim()
                      ? 'linear-gradient(135deg, #00d4d4 0%, #0098db 50%, #00b4f0 100%)'
                      : 'rgba(255,255,255,0.08)',
                    color: name.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                    boxShadow: name.trim() ? '0 0 24px rgba(0,212,212,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
                    border: name.trim() ? 'none' : '1px solid rgba(255,255,255,0.10)',
                    transition: 'background 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
                  }}
                >
                  {/* Shimmer sweep — only when active */}
                  {name.trim() && (
                    <motion.span
                      className="absolute inset-y-0 pointer-events-none"
                      style={{
                        left: '-75%',
                        width: '50%',
                        background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                      }}
                      animate={{ x: ['0%', '350%'] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                    />
                  )}
                  Continue →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Language picker */}
          <AnimatePresence mode="wait">
            {showLangPicker && !showOtherPicker && (
              <motion.div
                key="lang-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="pl-[2.6rem]"
              >
                <div className="grid grid-cols-4 gap-2.5">
                  {languageGrid.map((lang, i) => {
                    const isSelected = selectedLang === lang.code;
                    return (
                      <motion.button
                        key={lang.code}
                        whileTap={{ scale: 0.90 }}
                        onClick={() => void handleLangSelect(lang.code)}
                        disabled={submitting}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: submitting && !isSelected ? 0.25 : 1, scale: isSelected ? 1.06 : 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28, delay: i * 0.04 }}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl touch-manipulation"
                        style={{
                          background: isSelected ? 'rgba(0,212,212,0.15)' : 'var(--surface)',
                          border: isSelected ? '1.5px solid rgba(0,212,212,0.5)' : '1px solid var(--border)',
                          boxShadow: isSelected ? '0 0 14px rgba(0,212,212,0.25)' : 'none',
                        }}
                      >
                        <span className="text-2xl leading-none">{lang.flag}</span>
                        <span
                          className="text-[10px] font-bold leading-tight text-center"
                          style={{ color: isSelected ? '#00d4d4' : 'var(--foreground-muted)' }}
                        >
                          {lang.name}
                        </span>
                      </motion.button>
                    );
                  })}
                  {/* Other */}
                  <motion.button
                    whileTap={{ scale: 0.90 }}
                    onClick={() => void handleLangSelect('other')}
                    disabled={submitting}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: submitting ? 0.25 : 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 7 * 0.04 }}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl touch-manipulation"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-2xl leading-none">🌍</span>
                    <span className="text-[10px] font-bold leading-tight text-center" style={{ color: 'var(--foreground-muted)' }}>
                      Other
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {showOtherPicker && (
              <motion.div
                key="other-picker"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="pl-[2.6rem] flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { setShowOtherPicker(false); setOtherSearch(''); }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-xl touch-manipulation"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
                  >
                    ← Back
                  </motion.button>
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--foreground-subtle)' }}>
                    All languages
                  </span>
                </div>
                <input
                  ref={otherSearchRef}
                  type="text"
                  value={otherSearch}
                  onChange={e => setOtherSearch(e.target.value)}
                  placeholder="Search…"
                  inputMode="search"
                  className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    fontSize: '16px',
                  }}
                />
                <div className="grid grid-cols-4 gap-2 overflow-y-auto" style={{ maxHeight: '36vh' }}>
                  {filteredOther.map((lang, i) => {
                    const isSelected = selectedLang === lang.code;
                    return (
                      <motion.button
                        key={lang.code}
                        whileTap={{ scale: 0.90 }}
                        onClick={() => void handleLangSelect(lang.code)}
                        disabled={submitting}
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: submitting && !isSelected ? 0.25 : 1, scale: isSelected ? 1.06 : 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28, delay: Math.min(i * 0.02, 0.25) }}
                        className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl touch-manipulation"
                        style={{
                          background: isSelected ? 'rgba(0,212,212,0.15)' : 'var(--surface)',
                          border: isSelected ? '1.5px solid rgba(0,212,212,0.5)' : '1px solid var(--border)',
                          boxShadow: isSelected ? '0 0 14px rgba(0,212,212,0.25)' : 'none',
                        }}
                      >
                        <span className="text-xl leading-none">{lang.flag}</span>
                        <span
                          className="text-[9px] font-bold leading-tight text-center"
                          style={{ color: isSelected ? '#00d4d4' : 'var(--foreground-muted)' }}
                        >
                          {lang.name}
                        </span>
                      </motion.button>
                    );
                  })}
                  {filteredOther.length === 0 && (
                    <div className="col-span-4 py-6 text-center text-[11px]" style={{ color: 'var(--foreground-subtle)' }}>
                      No language found
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Login link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="shrink-0 flex justify-center pb-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={() => router.push('/')}
          className="text-xs font-medium"
          style={{ color: 'var(--foreground-subtle)' }}
        >
          Already have an account?{' '}
          <span style={{ color: '#00d4d4', fontWeight: 700 }}>Log in</span>
        </button>
      </motion.div>
    </div>
  );
}
