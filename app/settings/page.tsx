'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sun, Moon, Globe, MapPin } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';

type CardPreference = 'translation' | 'explanation' | 'both';

type TargetAccent = 'us' | 'gb';

const ALL_LANGUAGES = [
  { code: 'uk', label: 'Ukrainian',   flagCode: 'ua' },
  { code: 'en', label: 'English',     flagCode: 'gb' },
  { code: 'es', label: 'Spanish',     flagCode: 'es' },
  { code: 'pl', label: 'Polish',      flagCode: 'pl' },
  { code: 'de', label: 'German',      flagCode: 'de' },
  { code: 'fr', label: 'French',      flagCode: 'fr' },
  { code: 'it', label: 'Italian',     flagCode: 'it' },
  { code: 'pt', label: 'Portuguese',  flagCode: 'pt' },
  { code: 'tr', label: 'Turkish',     flagCode: 'tr' },
  { code: 'ja', label: 'Japanese',    flagCode: 'jp' },
  { code: 'zh', label: 'Chinese',     flagCode: 'cn' },
  { code: 'ar', label: 'Arabic',      flagCode: 'sa' },
  { code: 'hi', label: 'Hindi',       flagCode: 'in' },
  { code: 'ko', label: 'Korean',      flagCode: 'kr' },
  { code: 'nl', label: 'Dutch',       flagCode: 'nl' },
  { code: 'sv', label: 'Swedish',     flagCode: 'se' },
  { code: 'no', label: 'Norwegian',   flagCode: 'no' },
  { code: 'da', label: 'Danish',      flagCode: 'dk' },
  { code: 'fi', label: 'Finnish',     flagCode: 'fi' },
  { code: 'el', label: 'Greek',       flagCode: 'gr' },
  { code: 'ru', label: 'Russian',     flagCode: 'ru' },
  { code: 'cs', label: 'Czech',       flagCode: 'cz' },
  { code: 'ro', label: 'Romanian',    flagCode: 'ro' },
  { code: 'hu', label: 'Hungarian',   flagCode: 'hu' },
  { code: 'id', label: 'Indonesian',  flagCode: 'id' },
  { code: 'vi', label: 'Vietnamese',  flagCode: 'vn' },
  { code: 'th', label: 'Thai',        flagCode: 'th' },
  { code: 'he', label: 'Hebrew',      flagCode: 'il' },
  { code: 'fa', label: 'Persian',     flagCode: 'ir' },
];

const spring = { type: 'spring' as const, stiffness: 400, damping: 28 };

// ── Reusable styled row ──────────────────────────────────────────
function SettingRow({ label, description, last = false, children, isDark }: {
  label: string; description: string; last?: boolean; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <div
      className="px-5 py-4 flex items-center justify-between gap-4"
      style={{ borderBottom: last ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)'}` }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: isDark ? '#fff' : '#1D1D1F' }}>{label}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.44)' : 'rgba(0,0,0,0.44)' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

// ── Pill toggle (2 or 3 options) ─────────────────────────────────
function PillToggle<T extends string>({ options, value, onChange, isDark, accent = '#00d4d4' }: {
  options: { id: T; label: string; flag?: string }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-[18px] shrink-0"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
      }}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            transition={spring}
            onClick={() => onChange(opt.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs font-semibold transition-colors relative"
            style={isActive ? {
              background: isDark ? `${accent}18` : 'white',
              color: isDark ? accent : '#1D1D1F',
              boxShadow: isDark
                ? `0 0 16px ${accent}30, 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 ${accent}20`
                : '0 2px 8px rgba(0,0,0,0.12)',
              border: isDark ? `1px solid ${accent}30` : 'none',
            } : {
              color: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.35)',
            }}
          >
            {opt.flag && (
              <img src={`https://flagcdn.com/w40/${opt.flag}.png`} alt="" className="w-4 h-3 object-cover rounded-[3px] shrink-0" />
            )}
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Grid option buttons ───────────────────────────────────────────
function GridOptions<T extends string>({ options, value, onChange, isDark, cols = 2, accent = '#00d4d4' }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
  cols?: number;
  accent?: string;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={spring}
            onClick={() => onChange(opt.id)}
            className="text-xs font-semibold rounded-2xl px-3 py-3 transition-all"
            style={isActive ? {
              background: isDark ? `${accent}16` : accent,
              color: isDark ? accent : '#000',
              border: `1px solid ${isDark ? `${accent}35` : 'transparent'}`,
              boxShadow: isDark
                ? `0 0 20px ${accent}28, 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 ${accent}22`
                : `0 4px 16px ${accent}50`,
            } : {
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';
  const accent = isDark ? '#00d4d4' : '#0891b2';

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [cardPreference, setCardPreference] = useState<CardPreference>('both');

  const [targetAccent, setTargetAccent] = useState<TargetAccent>('us');
  const [referralCode, setReferralCode] = useState('');
  const [stealthInjectVocab, setStealthInjectVocab] = useState(false);
  const [stealthInjectGrammar, setStealthInjectGrammar] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(true);
  const [geoDetecting, setGeoDetecting] = useState(false);
  const [geoDetected, setGeoDetected] = useState<string | null>(null);

  const [langOpen, setLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Track profile visit for PWA install eligibility metric
  useEffect(() => {
    try { localStorage.setItem('aura.metrics.profile', '1'); } catch {}
  }, []);

  const filteredLanguages = ALL_LANGUAGES.filter(lang =>
    lang.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openLangDropdown = useCallback(() => {
    if (langRef.current) {
      const rect = langRef.current.getBoundingClientRect();
      const dropW = 232;
      const screenW = window.innerWidth;
      const rawLeft = rect.right - dropW;
      const clampedLeft = Math.max(8, Math.min(rawLeft, screenW - dropW - 8));
      setDropdownRect({ top: rect.bottom + 8, left: clampedLeft, width: dropW });
    }
    setLangOpen(true);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false); setDropdownRect(null);
      }
    };
    const handleResize = () => { setLangOpen(false); setDropdownRect(null); };
    document.addEventListener('click', close);
    window.addEventListener('resize', handleResize);
    return () => { document.removeEventListener('click', close); window.removeEventListener('resize', handleResize); };
  }, [langOpen]);

  // Load settings
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.user) {
          setDisplayName(data.user.name || '');
          setUsername(data.user.username || '');
          setNativeLanguage(data.user.nativeLanguage || '');
          setCardPreference((data.user.cardPreference as CardPreference) || 'both');

          setTargetAccent((data.user.targetAccent as TargetAccent) || 'us');
          setReferralCode(data.user.referralCode || '');
          setStealthInjectVocab(data.user.stealthInjectVocab ?? false);
          setStealthInjectGrammar(data.user.stealthInjectGrammar ?? false);
          
          if (data.user.email && !data.user.email.endsWith('@aura.os')) {
            setEmail(data.user.email);
          }
        }
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, []);

  // Auto-detect language from IP if not set
  useEffect(() => {
    if (!loading && !nativeLanguage) {
      setGeoDetecting(true);
      fetch('/api/geo')
        .then(r => r.json())
        .then(data => {
          if (data.language && ALL_LANGUAGES.find(l => l.code === data.language)) {
            setNativeLanguage(data.language);
            setGeoDetected(data.language);
          }
        })
        .catch(() => {})
        .finally(() => setGeoDetecting(false));
    }
  }, [loading, nativeLanguage]);

  // Debounced auto-save
  const debouncedSave = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!loading) {
      if (debouncedSave.current) clearTimeout(debouncedSave.current);
      debouncedSave.current = setTimeout(async () => {
        try {
            const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nativeLanguage, cardPreference, targetAccent, name: displayName, username, email, stealthInjectVocab, stealthInjectGrammar }),
          });
          const data = await res.json();
          if (res.status === 409) {
            setUsernameError(data.error || 'Username already taken.');
          } else if (res.status === 400 && data.error?.includes('email')) {
            setEmailError(data.error);
          } else {
            setUsernameError('');
            setEmailError('');
          }
        } catch {}
      }, 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeLanguage, cardPreference, targetAccent, displayName, username, email, stealthInjectVocab, stealthInjectGrammar, loading]);

  useEffect(() => () => { if (debouncedSave.current) clearTimeout(debouncedSave.current); }, []);

  // Computed styles
  const pageBg = isDark
    ? 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(59,130,246,0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 80% 15%, rgba(168,85,247,0.10) 0%, transparent 55%)'
    : 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(59,130,246,0.05) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 80% 15%, rgba(168,85,247,0.05) 0%, transparent 55%)';

  const cardBg = isDark
    ? 'rgba(255,255,255,0.042)'
    : 'rgba(255,255,255,0.88)';
  const cardBorder = isDark
    ? 'rgba(255,255,255,0.09)'
    : 'rgba(0,0,0,0.07)';
  const cardShadow = isDark
    ? '0 16px 48px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.10)'
    : '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)';

  const sectionLabelColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
  const sectionBorderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const headingColor = isDark ? '#fff' : '#1D1D1F';
  const subColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.44)';

  const selectedLang = ALL_LANGUAGES.find(l => l.code === nativeLanguage);

  return (
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: pageBg }} />

      {/* Header */}
      <header
        className="shrink-0 px-6 pb-6 flex items-center justify-between"
        style={{
          paddingTop: 'max(2rem, calc(1rem + env(safe-area-inset-top, 0px)))',
          borderBottom: `1px solid ${sectionBorderColor}`,
          background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div>
          <h1
            className="text-2xl font-black"
            style={{ color: headingColor, letterSpacing: '-0.04em' }}
          >
            Settings
          </h1>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: subColor }}>
            Personalize your learning experience.
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 md:px-6 py-5 space-y-4">

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-[28px] animate-pulse"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Profile ─────────────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.0 }}
              className="rounded-[28px] overflow-hidden max-w-xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(24px)' }}
            >
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${sectionBorderColor}` }}>
                <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: sectionLabelColor }}>
                  Profile
                </h2>
              </div>

              {/* Display name */}
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${sectionBorderColor}` }}>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: headingColor }}>
                  Display name
                </label>
                <p className="text-xs mb-3" style={{ color: subColor }}>How others see you in the app.</p>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-[14px] px-4 py-2.5 text-sm font-medium outline-none transition-all"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
                    color: headingColor,
                  }}
                  onFocus={e => { e.target.style.borderColor = accent; }}
                  onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'; }}
                />
              </div>

              {/* Username */}
              <div className="px-5 py-4">
                <label className="block text-sm font-semibold mb-1.5" style={{ color: headingColor }}>
                  Username
                </label>
                <p className="text-xs mb-3" style={{ color: subColor }}>Used by friends to find you. Only lowercase letters, numbers, underscores.</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold select-none" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)' }}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => {
                      setUsernameError('');
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    }}
                    placeholder="your_username"
                    className="w-full rounded-[14px] pl-8 pr-4 py-2.5 text-sm font-medium outline-none transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${usernameError ? 'rgba(248,113,113,0.6)' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
                      color: headingColor,
                    }}
                    onFocus={e => { e.target.style.borderColor = usernameError ? 'rgba(248,113,113,0.6)' : accent; }}
                    onBlur={e => { e.target.style.borderColor = usernameError ? 'rgba(248,113,113,0.6)' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'; }}
                  />
                </div>
                {usernameError && (
                  <p className="text-[11px] mt-1.5 font-semibold" style={{ color: 'rgba(248,113,113,0.9)' }}>{usernameError}</p>
                )}
              </div>

              {/* Email Protection */}
              <div className="px-5 py-4 bg-amber-500/5" style={{ borderTop: `1px solid ${sectionBorderColor}` }}>
                <label className="block text-sm font-semibold mb-1.5 text-amber-500">
                  Account Protection (Email)
                </label>
                <p className="text-xs mb-3" style={{ color: subColor }}>Link an email so you don't lose your progress if you clear cookies.</p>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmailError('');
                      setEmail(e.target.value.toLowerCase().trim());
                    }}
                    placeholder="your@email.com"
                    className="w-full rounded-[14px] px-4 py-2.5 text-sm font-medium outline-none transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${emailError ? 'rgba(248,113,113,0.6)' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
                      color: headingColor,
                    }}
                    onFocus={e => { e.target.style.borderColor = emailError ? 'rgba(248,113,113,0.6)' : accent; }}
                    onBlur={e => { e.target.style.borderColor = emailError ? 'rgba(248,113,113,0.6)' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'; }}
                  />
                </div>
                {emailError && (
                  <p className="text-[11px] mt-1.5 font-semibold" style={{ color: 'rgba(248,113,113,0.9)' }}>{emailError}</p>
                )}
              </div>
            </motion.section>

            {/* ── Preferences ─────────────────────────────────── */}
            <motion.section
              id="flashcards"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.04 }}
              className="rounded-[28px] overflow-hidden max-w-xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(24px)' }}
            >
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${sectionBorderColor}` }}>
                <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: sectionLabelColor }}>
                  Preferences
                </h2>
              </div>

              {/* Native language */}
              <SettingRow
                label="Native language"
                description="Used for explanations and corrections."
                isDark={isDark}
              >
                <div ref={langRef} className="relative shrink-0">
                  <motion.button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); langOpen ? setLangOpen(false) : openLangDropdown(); }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    className="flex items-center gap-2 w-44 rounded-[18px] px-3.5 py-2.5 text-sm focus:outline-none transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
                      color: headingColor,
                    }}
                  >
                    {geoDetecting ? (
                      <MapPin className="w-4 h-4 animate-pulse shrink-0" style={{ color: accent }} />
                    ) : selectedLang ? (
                      <img src={`https://flagcdn.com/w40/${selectedLang.flagCode}.png`} alt="" className="w-6 h-4 object-cover rounded-sm shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 shrink-0 opacity-40" />
                    )}
                    <span className="flex-1 text-left truncate text-xs font-medium">
                      {geoDetecting ? 'Detecting…' : (selectedLang?.label ?? 'Select…')}
                    </span>
                    {geoDetected && !geoDetecting && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-md shrink-0"
                        style={{ background: `${accent}18`, color: accent }}>
                        Auto
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform opacity-40 ${langOpen ? 'rotate-180' : ''}`} />
                  </motion.button>

                  {mounted && createPortal(
                    <AnimatePresence>
                      {langOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={spring}
                          className="fixed z-[9999] rounded-2xl py-2 max-h-72 overflow-y-auto no-scrollbar"
                          style={{
                            ...(dropdownRect ? { top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width } : {}),
                            background: isDark ? 'rgba(15,15,20,0.97)' : 'rgba(255,255,255,0.97)',
                            backdropFilter: 'blur(28px)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.12)',
                          }}
                        >
                          <div className="px-3 pb-2">
                            <input
                              type="text"
                              placeholder="Search…"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
                                color: headingColor,
                              }}
                              autoFocus
                            />
                          </div>
                          {filteredLanguages.map((lang) => {
                            const isSelected = nativeLanguage === lang.code;
                            return (
                              <motion.button
                                key={lang.code}
                                type="button"
                                whileTap={{ scale: 0.98 }}
                                onClick={(e) => { e.stopPropagation(); setNativeLanguage(lang.code); setGeoDetected(null); setLangOpen(false); setDropdownRect(null); setSearchQuery(''); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                                style={{
                                  background: isSelected ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(8,145,178,0.08)') : 'transparent',
                                  color: isSelected ? (isDark ? '#fff' : accent) : (isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)'),
                                  fontWeight: isSelected ? 700 : 400,
                                }}
                              >
                                <img src={`https://flagcdn.com/w40/${lang.flagCode}.png`} alt="" className="w-6 h-4 object-cover rounded-sm shrink-0" />
                                {lang.label}
                              </motion.button>
                            );
                          })}
                          {filteredLanguages.length === 0 && (
                            <div className="px-4 py-4 text-center text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                              No results
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
                </div>
              </SettingRow>

              {/* Target accent */}
              <SettingRow label="Target pronunciation" description="AI personas speak with this accent." isDark={isDark}>
                <PillToggle
                  value={targetAccent}
                  onChange={setTargetAccent}
                  isDark={isDark}
                  options={[
                    { id: 'us' as TargetAccent, label: 'American', flag: 'us' },
                    { id: 'gb' as TargetAccent, label: 'British',  flag: 'gb' },
                  ]}
                />
              </SettingRow>



              {/* Flashcard back */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: headingColor }}>Flashcard back</p>
                    <p className="text-xs mt-0.5" style={{ color: subColor }}>What shows when you reveal a card.</p>
                  </div>
                </div>
                <GridOptions
                  value={cardPreference}
                  onChange={setCardPreference}
                  isDark={isDark}
                  cols={3}
                  options={[
                    { id: 'translation' as CardPreference, label: 'Translation' },
                    { id: 'explanation' as CardPreference, label: 'Usage' },
                    { id: 'both' as CardPreference, label: 'Both' },
                  ]}
                />
              </div>
            </motion.section>

            {/* ── Stealth Practice ────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.07 }}
              className="rounded-[28px] overflow-hidden max-w-xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(24px)' }}
            >
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${sectionBorderColor}` }}>
                <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: sectionLabelColor }}>
                  Stealth Practice
                </h2>
              </div>

              <SettingRow label="Inject Vocabulary" description="AI casually uses your Flashcard words in chat." isDark={isDark}>
                <button
                  type="button"
                  onClick={() => setStealthInjectVocab(!stealthInjectVocab)}
                  className={`w-11 h-6 rounded-full transition-colors relative`}
                  style={{ background: stealthInjectVocab ? accent : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                >
                  <motion.div
                    animate={{ x: stealthInjectVocab ? 20 : 2 }}
                    className="w-5 h-5 rounded-full absolute top-[2px] bg-white shadow-sm"
                  />
                </button>
              </SettingRow>

              <SettingRow label="Inject Grammar" description="AI subtly challenges you with your Learning List grammar." isDark={isDark} last>
                <button
                  type="button"
                  onClick={() => setStealthInjectGrammar(!stealthInjectGrammar)}
                  className={`w-11 h-6 rounded-full transition-colors relative`}
                  style={{ background: stealthInjectGrammar ? accent : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                >
                  <motion.div
                    animate={{ x: stealthInjectGrammar ? 20 : 2 }}
                    className="w-5 h-5 rounded-full absolute top-[2px] bg-white shadow-sm"
                  />
                </button>
              </SettingRow>
            </motion.section>

            {/* ── Appearance ──────────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.10 }}
              className="rounded-[28px] overflow-hidden max-w-xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(24px)' }}
            >
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${sectionBorderColor}` }}>
                <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: sectionLabelColor }}>
                  Appearance
                </h2>
              </div>

              <SettingRow label="Theme" description="Switch between dark and light interface." isDark={isDark} last>
                <div
                  className="flex items-center gap-0.5 p-1 rounded-[18px] shrink-0"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                  }}
                >
                  {([
                    { id: 'dark', label: 'Dark',  icon: Moon },
                    { id: 'light', label: 'Light', icon: Sun },
                  ] as const).map((opt) => {
                    const Icon = opt.icon;
                    const isActive = theme === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        transition={spring}
                        onClick={() => setTheme(opt.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] text-xs font-semibold transition-colors"
                        style={isActive ? {
                          background: isDark ? 'rgba(224,64,251,0.14)' : 'white',
                          color: isDark ? '#e040fb' : '#1D1D1F',
                          border: isDark ? '1px solid rgba(224,64,251,0.3)' : 'none',
                          boxShadow: isDark
                            ? '0 0 16px rgba(224,64,251,0.28), 0 2px 8px rgba(0,0,0,0.3)'
                            : '0 2px 8px rgba(0,0,0,0.12)',
                        } : {
                          color: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.35)',
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </SettingRow>
            </motion.section>
            
            {/* ── Referrals ──────────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.15 }}
              className="rounded-[28px] overflow-hidden max-w-xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(24px)' }}
            >
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${sectionBorderColor}` }}>
                <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: sectionLabelColor }}>
                  Refer friends
                </h2>
              </div>

              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight" style={{ color: headingColor }}>Your Invite Link</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: subColor }}>
                    Share your link. You and your friend both earn +100 XP when they join.
                  </p>
                  
                  {referralCode ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div 
                        className="px-3 py-2 rounded-xl text-xs font-mono truncate max-w-[200px] select-all cursor-text"
                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                      >
                       {typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `aurapp.com/?ref=${referralCode}`}
                      </div>
                      <button
                        onClick={() => {
                          const link = typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : '';
                          navigator.clipboard.writeText(link);
                          // Optionally, show a toast here
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                        style={{ background: accent, color: isDark ? '#000' : '#fff' }}
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs mt-3 italic" style={{ color: subColor }}>Generating code soon...</p>
                  )}
                </div>
              </div>
            </motion.section>

          </>
        )}
      </div>
    </div>
  );
}
