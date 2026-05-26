'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, Mic, Star, Search, Globe, Lock, User, Trash2, ArrowLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import useSWR, { mutate as globalMutate } from 'swr';

import { SPRING_OPTIONS } from '@/lib/config';
import { getVoiceById } from '@/config/voices';
import {
  FEATURED_PRESETS,
  FEATURED_NAMES,
  injectSlots,
  type FeaturedPreset,
  type DynamicSlot,
} from '@/config/featured-personas';
import { useTheme } from '@/lib/contexts/theme-context';
import { SlotCombobox } from './SlotCombobox';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  category?: string;
  voiceId?: string | null;
  isPublic?: boolean;
  isOwn?: boolean;
  creatorName?: string | null;
  creatorId?: string | null;
}

interface PersonaStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onInitialize: (personaId: string) => void;
}

type GenderPref  = 'auto' | 'male' | 'female';
type MobileTab   = 'browse' | 'create';

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDER_OPTS: { id: GenderPref; label: string; icon: string }[] = [
  { id: 'auto',   label: 'Auto',   icon: '✨' },
  { id: 'male',   label: 'Male',   icon: '♂' },
  { id: 'female', label: 'Female', icon: '♀' },
];

const SWR_KEY = '/api/personas';
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Main Component ───────────────────────────────────────────────────────────

export function PersonaStudio({ isOpen, onClose, onInitialize }: PersonaStudioProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  // ── Single form state object ──────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name:        '',
    description: '',
    avatarUrl:   '',
    systemPrompt:'',
    genderPref:  'auto' as GenderPref,
    isPublic:    false,
  });
  const updateForm = useCallback(
    <K extends keyof typeof formData>(key: K, value: typeof formData[K]) =>
      setFormData((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const resetForm = useCallback(() =>
    setFormData({ name: '', description: '', avatarUrl: '', systemPrompt: '', genderPref: 'auto', isPublic: false }),
    [],
  );

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [mobileTab,   setMobileTab]   = useState<MobileTab>('browse');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Slot config panel ─────────────────────────────────────────────────────
  const [slotPreset,  setSlotPreset]  = useState<FeaturedPreset | null>(null);
  const [slotValues,  setSlotValues]  = useState<Record<string, string | string[]>>({});

  // ── SWR data fetching ─────────────────────────────────────────────────────
  const { data: templates = [], isLoading: loading } = useSWR<Persona[]>(
    isOpen ? SWR_KEY : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleCardClick = (preset: FeaturedPreset) => {
    if (saving) return;
    if (preset.dynamicSlots?.length) {
      // Initialize slot values
      const init: Record<string, string | string[]> = {};
      for (const slot of preset.dynamicSlots) {
        init[slot.key] = slot.multi ? [] : '';
      }
      setSlotValues(init);
      setSlotPreset(preset);
    } else {
      void handleLaunchFeatured(preset, {});
    }
  };

  const handleSlotLaunch = () => {
    if (!slotPreset) return;
    // Resolve multi-select arrays to concatenated strings
    const resolved: Record<string, string> = {};
    for (const slot of slotPreset.dynamicSlots ?? []) {
      const raw = slotValues[slot.key];
      resolved[slot.key] = Array.isArray(raw)
        ? raw.join(' & ')
        : (raw as string) ?? '';
    }
    void handleLaunchFeatured(slotPreset, resolved).catch(() => {
      setSlotPreset(null);
    });
  };

  const handleLaunchFeatured = async (preset: FeaturedPreset, slots: Record<string, string>) => {
    if (saving) return;
    setSaving(true);
    const resolvedPrompt = injectSlots(preset.systemPrompt, slots);
    try {
      // Check SWR cache first to avoid duplicate creation
      const cached = (templates as Persona[]).find(
        (t) => t.name.toLowerCase() === preset.name.toLowerCase(),
      );
      if (cached) {
        // Update avatarUrl if the persona exists but doesn't have one or has a different one
        if (!cached.avatarUrl && preset.image) {
          await fetch(`/api/personas/${cached.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: preset.image }),
          });
          // Update cache
          await globalMutate(SWR_KEY, (prev: Persona[] = []) => 
            prev.map(p => p.id === cached.id ? { ...p, avatarUrl: preset.image } : p), false);
        }
        onInitialize(cached.id);
        setSaving(false);
        return;
      }

      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         preset.name,
          description:  preset.description,
          systemPrompt: resolvedPrompt,
          voiceId:      preset.voiceId,
          avatarUrl:    preset.image || null,
        }),
      });
      const persona = await res.json();
      if (!res.ok || persona?.error) throw new Error(persona?.error || 'Launch failed');
      // Optimistically add to SWR cache
      await globalMutate(SWR_KEY, (prev: Persona[] = []) => [persona, ...prev], false);
      onInitialize(persona.id);
    } catch (err) {
      toast.error('Failed to launch persona. Please try again.');
      setSaving(false);
    }
  };

  const handleDelete = async (personaId: string) => {
    if (deletingId) return;
    setDeletingId(personaId);
    try {
      const res = await fetch(`/api/personas/${personaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await globalMutate(SWR_KEY, (prev: Persona[] = []) => prev.filter((p) => p.id !== personaId), false);
      toast.success('Persona deleted');
    } catch {
      toast.error('Failed to delete persona');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || saving) return;
    setSaving(true);

    let voiceId: string | null = null;
    let voiceIdUS: string | null = null;
    let voiceIdGB: string | null = null;
    try {
      const genRes = await fetch('/api/personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             formData.name.trim(),
          description:      formData.description.trim(),
          genderPreference: formData.genderPref,
        }),
      });
      if (genRes.ok) {
        const g = await genRes.json();
        voiceId   = g?.voiceId   ?? null;
        voiceIdUS = g?.voiceIdUS ?? null;
        voiceIdGB = g?.voiceIdGB ?? null;
      }
    } catch { /* voice gen is best-effort */ }

    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        formData.name.trim(),
          description: formData.description.trim(),
          avatarUrl:   formData.avatarUrl.trim() || null,
          systemPrompt:formData.systemPrompt.trim() || null,
          gender:      formData.genderPref === 'auto' ? 'neutral' : formData.genderPref,
          isPublic:    formData.isPublic,
          voiceId, voiceIdUS, voiceIdGB,
        }),
      });
      const persona = await res.json();
      if (!res.ok || persona?.error) throw new Error(persona?.error || 'Create failed');
      await globalMutate(SWR_KEY, (prev: Persona[] = []) => [persona, ...prev], false);
      toast.success(`"${persona.name}" created!`);
      resetForm();
      onInitialize(persona.id);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create persona');
      setSaving(false);
    }
  };

  // ── Search filtering ──────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filteredFeatured = FEATURED_PRESETS.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q) || (p.viralTag ?? '').toLowerCase().includes(q)
  );
  const ownPersonas       = (templates as Persona[]).filter(p => p.isOwn && (
    !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  ));
  const communityPersonas = (templates as Persona[]).filter(p => p.isPublic && !p.isOwn && p.category !== 'trending' && (
    !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.creatorName ?? '').toLowerCase().includes(q)
  ));
  const trendingPersonas  = (templates as Persona[]).filter(p => p.category === 'trending' && (
    !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  ));
  const hasResults = filteredFeatured.length > 0 || ownPersonas.length > 0 || communityPersonas.length > 0 || trendingPersonas.length > 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Sub-panels
  // ───────────────────────────────────────────────────────────────────────────

  const CreateForm = (
    <div className="space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] hidden md:block text-foreground-subtle">
        New persona
      </p>

      <div className="space-y-3">
        {/* Name */}
        <div>
          <label htmlFor="ps-name" className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-1.5 text-foreground-subtle">
            Name
          </label>
          <input
            id="ps-name"
            className="w-full rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/70 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]"
            value={formData.name}
            onChange={(e) => updateForm('name', e.target.value)}
            placeholder="Strict HR, Toxic Zoomer…"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="ps-desc" className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-1.5 text-foreground-subtle">
            One-line description
          </label>
          <input
            id="ps-desc"
            className="w-full rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/70 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]"
            value={formData.description}
            onChange={(e) => updateForm('description', e.target.value)}
            placeholder="Blunt HR manager that hates vague answers."
          />
        </div>

        {/* Gender pref */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-1.5 text-foreground-subtle">
            Voice gender
          </label>
          <div className="flex gap-2">
            {GENDER_OPTS.map((opt) => {
              const active = formData.genderPref === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={SPRING_OPTIONS}
                  onClick={() => updateForm('genderPref', opt.id)}
                  aria-label={`Voice gender: ${opt.label}`}
                  aria-pressed={active}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[11px] font-bold border transition-all"
                  style={active ? {
                    background:   isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.10)',
                    borderColor:  isDark ? 'rgba(34,211,238,0.5)'  : 'rgba(8,145,178,0.4)',
                    color:        isDark ? '#22d3ee' : '#0891b2',
                    boxShadow:    `0 0 12px ${isDark ? 'rgba(34,211,238,0.2)' : 'rgba(8,145,178,0.15)'}`,
                  } : {
                    background:  'var(--surface)',
                    borderColor: 'var(--border)',
                    color:       'var(--foreground-muted)',
                  }}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[10px] mt-1.5 leading-relaxed text-foreground-subtle">
            AI will pick the best matching voice by vibe and personality.
          </p>
        </div>

        {/* Avatar URL */}
        <div>
          <label htmlFor="ps-avatar" className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-1.5 text-foreground-subtle">
            Avatar URL <span className="normal-case text-foreground-subtle/60">(optional)</span>
          </label>
          <input
            id="ps-avatar"
            className="w-full rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/70 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]"
            value={formData.avatarUrl}
            onChange={(e) => updateForm('avatarUrl', e.target.value)}
            placeholder="https://…"
          />
        </div>

        {/* Behaviour prompt */}
        <div>
          <label htmlFor="ps-prompt" className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-1.5 text-foreground-subtle">
            Behaviour prompt <span className="normal-case text-foreground-subtle/60">(optional)</span>
          </label>
          <textarea
            id="ps-prompt"
            className="w-full rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/70 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] min-h-[68px] resize-none"
            value={formData.systemPrompt}
            onChange={(e) => updateForm('systemPrompt', e.target.value)}
            placeholder="How should this persona talk and behave?"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-2 text-foreground-subtle">
            Visibility
          </label>
          <div className="flex gap-2">
            {[
              { val: false, icon: <Lock className="w-3 h-3" />, label: 'Private', activeColor: isDark ? '#c084fc' : '#7c3aed', activeBg: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(124,58,237,0.10)', activeBorder: isDark ? 'rgba(168,85,247,0.5)' : 'rgba(124,58,237,0.4)' },
              { val: true,  icon: <Globe className="w-3 h-3" />, label: 'Public',  activeColor: isDark ? '#22d3ee' : '#0891b2', activeBg: isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.10)',  activeBorder: isDark ? 'rgba(34,211,238,0.5)' : 'rgba(8,145,178,0.4)' },
            ].map(({ val, icon, label, activeColor, activeBg, activeBorder }) => {
              const active = formData.isPublic === val;
              return (
                <motion.button
                  key={label}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={SPRING_OPTIONS}
                  aria-label={`Visibility: ${label}`}
                  aria-pressed={active}
                  onClick={() => updateForm('isPublic', val)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[11px] font-bold border transition-all"
                  style={active ? { background: activeBg, borderColor: activeBorder, color: activeColor } : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground-muted)' }}
                >
                  {icon}
                  {label}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[10px] mt-1.5 leading-relaxed text-foreground-subtle">
            {formData.isPublic ? 'Anyone can find and use your persona.' : 'Only you can see and use this persona.'}
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        transition={SPRING_OPTIONS}
        disabled={!formData.name.trim() || saving}
        onClick={handleCreate}
        className="w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background:  isDark ? '#ffffff' : '#1D1D1F',
          color:       isDark ? '#000000' : '#ffffff',
          boxShadow:   isDark ? '0 18px 45px rgba(0,0,0,0.85)' : '0 8px 24px rgba(0,0,0,0.18)',
        }}
      >
        {saving ? 'Creating…' : 'Create Persona'}
      </motion.button>
    </div>
  );

  // ── Slot Config Panel ─────────────────────────────────────────────────────
  const SlotConfigPanel = slotPreset ? (
    <motion.div
      key="slot-panel"
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      className="absolute inset-0 flex flex-col px-6 pt-6 pb-[calc(48px+env(safe-area-inset-bottom))] md:p-8 overflow-y-auto no-scrollbar"
      style={{
        zIndex: 10,
        background: isDark ? 'rgba(10,12,20,0.98)' : 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      }}
    >
      {/* Back button */}
      <button
        type="button"
        aria-label="Back to browse"
        onClick={() => {
           if (typeof window !== 'undefined' && window.navigator.vibrate) window.navigator.vibrate(10);
           setSlotPreset(null);
        }}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] mb-6 w-fit text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors dopamine-button focus:outline-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* Persona header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 neon-cyan"
          style={{ background: 'var(--surface-hover)' }}
        >
          {slotPreset.emoji}
        </div>
        <div>
          <p className="micro-copy mb-0.5 glow-cyan">
            {slotPreset.tag} • Configuration
          </p>
          <h3 className="brutal-heading text-xl">
            {slotPreset.name}
          </h3>
        </div>
      </div>

      <p className="text-sm font-medium leading-relaxed mb-8 text-[var(--foreground-muted)] max-w-md">
        {slotPreset.description}
      </p>

      {/* Slot inputs */}
      <div className="space-y-6 flex-1 max-w-md">
        {slotPreset.dynamicSlots?.map((slot: DynamicSlot) => (
          <div key={slot.key}>
            {slot.multi ? (
              <SlotCombobox
                id={`slot-${slot.key}`}
                label={slot.label}
                options={slot.options}
                placeholder={slot.placeholder}
                value={(slotValues[slot.key] as string[]) ?? []}
                onChange={(tags) => {
                  if (typeof window !== 'undefined' && window.navigator.vibrate) window.navigator.vibrate(10);
                  setSlotValues((prev) => ({ ...prev, [slot.key]: tags }));
                }}
                isDark={isDark}
              />
            ) : (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] mb-2 text-[var(--foreground-muted)]">
                  {slot.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {slot.options.map((opt) => {
                    const active = slotValues[slot.key] === opt;
                    return (
                      <motion.button
                        key={opt}
                        type="button"
                        whileTap={{ scale: 0.93 }}
                        transition={SPRING_OPTIONS}
                        aria-pressed={active}
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.navigator.vibrate) window.navigator.vibrate(10);
                          setSlotValues((prev) => ({ ...prev, [slot.key]: opt }));
                        }}
                        className="px-4 py-2.5 rounded-full text-[12px] font-black tracking-wide border transition-all"
                        style={active ? {
                          background:  'var(--accent-primary)',
                          borderColor: 'var(--accent-primary)',
                          color:       'var(--background)',
                          boxShadow:   'var(--shadow-glow-cyan)'
                        } : {
                          background:  'var(--surface)',
                          borderColor: 'var(--border)',
                          color:       'var(--foreground)',
                        }}
                      >
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Launch button */}
      <motion.button
        type="button"
        disabled={saving}
        onClick={() => {
          if (typeof window !== 'undefined' && window.navigator.vibrate) window.navigator.vibrate(20);
          handleSlotLaunch();
        }}
        className="dopamine-button w-full max-w-md mt-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] shadow-[var(--shadow-glow-cyan)] disabled:opacity-50 focus:outline-none"
      >
        <Zap className="w-4 h-4 fill-current opacity-80" />
        {saving ? 'Initializing…' : 'Start Session'}
      </motion.button>
    </motion.div>
  ) : null;

  // ── Browse Panel ──────────────────────────────────────────────────────────
  const BrowsePanel = (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}
        />
        <input
          id="ps-search"
          type="search"
          aria-label="Search personas"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search personas…"
          className="w-full rounded-2xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]"
        />
        {searchQuery && (
          <button
            aria-label="Clear search"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!hasResults && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Search className="w-8 h-8 text-foreground-subtle" />
          <p className="text-sm font-semibold text-foreground-subtle">No personas found for &ldquo;{searchQuery}&rdquo;</p>
        </div>
      )}

      {/* ── Featured / Trending ─────────────────────────────────────────── */}
      {(filteredFeatured.length > 0 || trendingPersonas.length > 0) && (
        <section aria-label="Featured personas">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-subtle">Trending</p>
            <span className="text-[10px] text-foreground-subtle">
              {FEATURED_PRESETS.length + trendingPersonas.length} available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatured.map((preset) => (
              <FeaturedCard
                key={preset.name}
                preset={preset}
                saving={saving}
                isDark={isDark}
                onClick={() => handleCardClick(preset)}
              />
            ))}

            {loading ? (
              <div className="col-span-full flex items-center justify-center h-28">
                <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            ) : trendingPersonas.map((t) => (
              <PersonaCard
                key={t.id}
                template={t}
                onSelect={onInitialize}
                isDark={isDark}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Community ───────────────────────────────────────────────────── */}
      {communityPersonas.length > 0 && (
        <section aria-label="Community personas">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-subtle">Community</p>
            <span className="text-[10px] text-foreground-subtle">{communityPersonas.length} public</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communityPersonas.map((t) => (
              <PersonaCard key={t.id} template={t} onSelect={onInitialize} isDark={isDark} />
            ))}
          </div>
        </section>
      )}

      {/* ── Your Personas ────────────────────────────────────────────────── */}
      {ownPersonas.length > 0 && (
        <section aria-label="Your personas">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-subtle">Your Personas</p>
            <span className="text-[10px] text-foreground-subtle">{ownPersonas.length} created</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownPersonas.map((t) => (
              <PersonaCard
                key={t.id}
                template={t}
                onSelect={onInitialize}
                isDark={isDark}
                onDelete={handleDelete}
                isDeleting={deletingId === t.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Persona Studio"
          className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center md:p-8"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{
              background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(12px) saturate(150%)',
              WebkitBackdropFilter: 'blur(12px) saturate(150%)',
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 300 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 500 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.y > 150 || velocity.y > 500) onClose();
            }}
            className="relative w-full h-[92dvh] md:max-w-6xl md:h-[85vh] rounded-t-[40px] md:rounded-[40px] overflow-hidden flex flex-col z-10 mx-auto"
            style={{
              background: isDark ? 'rgba(10,12,20,0.88)' : 'rgba(255,255,255,0.90)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 -20px 80px rgba(0,0,0,0.6)'
                : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -16px 40px rgba(0,0,0,0.15)',
              maxHeight: '92dvh',
            }}
          >
            {/* iOS Grabber */}
            <div className="w-full h-5 md:hidden flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing pb-2 pt-3">
              <div className="w-12 h-1.5 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
            </div>

            {/* Header */}
            <div
              className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}
            >
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-foreground-subtle">
                  Persona Studio
                </p>
                <h2 className="text-xl md:text-2xl font-black tracking-tighter" style={{ color: isDark ? '#ffffff' : '#1D1D1F' }}>
                  Choose your persona
                </h2>
              </div>
              <button
                aria-label="Close Persona Studio"
                onClick={onClose}
                className="tap-target rounded-full transition-colors shrink-0"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'}`,
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile tabs */}
            <div className="md:hidden shrink-0 flex" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
              {(['browse', 'create'] as MobileTab[]).map((tab) => {
                const active = mobileTab === tab;
                const activeColor = isDark ? '#22d3ee' : '#0891b2';
                return (
                  <button
                    key={tab}
                    onClick={() => setMobileTab(tab)}
                    className="flex-1 py-3 text-xs font-black uppercase tracking-[0.25em] transition-colors relative"
                    style={{ color: active ? activeColor : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {active && (
                      <motion.div
                        layoutId="studio-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                        style={{ background: activeColor }}
                        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Sidebar — desktop create form */}
              <div
                className="hidden md:block w-80 shrink-0 p-6 overflow-y-auto"
                style={{
                  borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(248,248,250,0.9)',
                  backdropFilter: 'blur(24px)',
                }}
              >
                {CreateForm}
              </div>

              {/* Main panel — browse + slot config overlay */}
              <div className="hidden md:block flex-1 min-h-0 relative">
                <div className="absolute inset-0 overflow-y-auto p-6 md:p-8 no-scrollbar">
                  {BrowsePanel}
                </div>
                <AnimatePresence>
                  {slotPreset && SlotConfigPanel}
                </AnimatePresence>
              </div>

              {/* Mobile panels */}
              <AnimatePresence mode="wait" initial={false}>
                {mobileTab === 'browse' ? (
                  <motion.div
                    key="mobile-browse"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="md:hidden flex-1 min-h-0 relative"
                  >
                    <div className="absolute inset-0 overflow-y-auto p-5 no-scrollbar">
                      {BrowsePanel}
                    </div>
                    <AnimatePresence>
                      {slotPreset && SlotConfigPanel}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mobile-create"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.18 }}
                    className="md:hidden flex-1 min-h-0 overflow-y-auto p-5 no-scrollbar"
                  >
                    {CreateForm}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── FeaturedCard ─────────────────────────────────────────────────────────────

function FeaturedCard({
  preset,
  saving,
  isDark,
  onClick,
}: {
  preset: FeaturedPreset;
  saving: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const isViral  = preset.category === 'viral';
  const accentCyan = isDark ? '#22d3ee' : '#0891b2';
  const accentPink = isDark ? '#f472b6' : '#db2777';

  return (
    <motion.article
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.94 }}
      role="button"
      tabIndex={0}
      aria-label={`Launch ${preset.name} persona`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`p-5 rounded-[28px] flex flex-col justify-between text-left relative overflow-hidden shadow-xl group cursor-pointer ${saving ? 'opacity-60 pointer-events-none' : ''}`}
      style={{
        background: isDark ? 'rgba(34,211,238,0.04)' : 'rgba(8,145,178,0.04)',
        border: `1px solid ${isDark ? 'rgba(34,211,238,0.18)' : 'rgba(8,145,178,0.18)'}`,
      }}
      onClick={onClick}
    >
      {/* Hover radial glow */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute -inset-16 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.12),transparent_60%),radial-gradient(circle_at_100%_100%,rgba(244,63,94,0.10),transparent_60%)]" />
      </div>

      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Image or emoji avatar */}
          {preset.image ? (
            <div
              className="w-10 h-10 rounded-2xl overflow-hidden shrink-0"
              style={{
                background: isDark ? 'rgba(34,211,238,0.1)' : 'rgba(8,145,178,0.08)',
                border: `1px solid ${isDark ? 'rgba(34,211,238,0.2)' : 'rgba(8,145,178,0.18)'}`,
              }}
            >
              <img
                src={preset.image}
                alt={preset.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{
                background: isDark ? 'rgba(34,211,238,0.1)' : 'rgba(8,145,178,0.08)',
                border: `1px solid ${isDark ? 'rgba(34,211,238,0.2)' : 'rgba(8,145,178,0.18)'}`,
              }}
            >
              {preset.emoji}
            </div>
          )}



          {/* Dynamic slot indicator */}
          {preset.dynamicSlots?.length ? (
            <div
              className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              }}
            >
              <ChevronRight className="w-2.5 h-2.5" />
              Config
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
            {preset.tag}
          </p>
          <h3 className="text-sm font-black tracking-tight uppercase" style={{ color: isDark ? '#ffffff' : '#1D1D1F' }}>
            {preset.name}
          </h3>
        </div>

        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
          {preset.description}
        </p>
      </div>

      {/* CTA */}
      <div className="relative z-10 flex justify-end mt-4">
        <div
          className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 shadow-[var(--shadow-glow-cyan)] transition-colors dopamine-button disabled:opacity-50"
          style={{
            background: 'var(--foreground)',
            color: 'var(--background)'
          }}
        >
          <Zap className="w-3.5 h-3.5 fill-current opacity-80" />
          Initialize
        </div>
      </div>
    </motion.article>
  );
}

// ─── PersonaCard ──────────────────────────────────────────────────────────────

function PersonaCard({
  template,
  onSelect,
  isDark,
  onDelete,
  isDeleting = false,
}: {
  template: Persona;
  onSelect: (id: string) => void;
  isDark: boolean;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}) {
  const voice      = template.voiceId ? getVoiceById(template.voiceId) : null;
  const isFeatured = FEATURED_NAMES.has(template.name.toLowerCase());
  const accentCyan = isDark ? '#22d3ee' : '#0891b2';

  const customCardBg     = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const customCardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)';

  return (
    <motion.article
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.94 }}
      tabIndex={0}
      role="button"
      aria-label={`Start chat with ${template.name}`}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(template.id)}
      className="p-5 rounded-[28px] flex flex-col justify-between text-left relative overflow-hidden shadow-xl group cursor-pointer"
      style={{ background: customCardBg, border: `1px solid ${customCardBorder}` }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onSelect(template.id);
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute -inset-16 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.15),transparent_60%),radial-gradient(circle_at_100%_0%,rgba(236,72,153,0.15),transparent_60%)]" />
      </div>

      <div className="relative z-10 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar with error fallback */}
          <div
            className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
            style={{
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            }}
          >
            {template.avatarUrl ? (
              <img
                src={template.avatarUrl}
                alt={template.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('style');
                }}
              />
            ) : null}
            <span
              className="text-sm font-bold"
              style={{
                display: template.avatarUrl ? 'none' : 'block',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {template.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Public/Private badge */}
          {template.isOwn && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
              style={{
                background: template.isPublic
                  ? isDark ? 'rgba(34,211,238,0.1)' : 'rgba(8,145,178,0.08)'
                  : isDark ? 'rgba(168,85,247,0.1)' : 'rgba(124,58,237,0.08)',
                border: `1px solid ${template.isPublic
                  ? isDark ? 'rgba(34,211,238,0.25)' : 'rgba(8,145,178,0.2)'
                  : isDark ? 'rgba(168,85,247,0.3)' : 'rgba(124,58,237,0.2)'}`,
                color: template.isPublic ? accentCyan : isDark ? '#c084fc' : '#7c3aed',
              }}
            >
              {template.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {template.isPublic ? 'Public' : 'Private'}
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em]"
            style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
            {isFeatured ? 'Featured' : template.isOwn ? 'Yours' : 'Popular'}
          </p>
          <h3 className="text-sm font-black tracking-tight uppercase" style={{ color: isDark ? '#ffffff' : '#1D1D1F' }}>
            {template.name}
          </h3>
        </div>

        <p className="text-[11px] leading-relaxed line-clamp-2"
          style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
          {template.description}
        </p>

        {template.creatorName && !template.isOwn && (
          <div className="flex items-center gap-1">
            <User className="w-2.5 h-2.5 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />
            <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
              by @{template.creatorName}
            </span>
          </div>
        )}

        {voice && (
          <div className="flex items-center gap-1.5">
            <Mic className="w-3 h-3 shrink-0" style={{ color: accentCyan, opacity: 0.7 }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: accentCyan, opacity: 0.7 }}>
              {voice.gender} · {voice.accent === 'gb' ? 'British' : 'American'}
            </span>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className="relative z-10 flex items-center justify-between mt-4 gap-2">
        {template.isOwn && onDelete && (
          <button
            type="button"
            aria-label={`Delete ${template.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(template.id);
            }}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 dopamine-button"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {isDeleting
              ? <div className="w-3 h-3 border-2 border-red-500/40 border-t-red-500 rounded-full animate-spin" />
              : <Trash2 className="w-3.5 h-3.5 text-red-400" />
            }
          </button>
        )}
        <div
          className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 shadow-[var(--shadow-glow-cyan)] transition-colors dopamine-button disabled:opacity-50 ml-auto"
          style={{
            background: 'var(--foreground)',
            color: 'var(--background)'
          }}
        >
          <Zap className="w-3.5 h-3.5 fill-current opacity-80" />
          Initialize
        </div>
      </div>
    </motion.article>
  );
}
