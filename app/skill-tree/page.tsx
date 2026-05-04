'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Sparkles, Check, ChevronDown, ChevronLeft,
  BookOpen, AlertTriangle, Lightbulb, Zap, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { getTheory } from '@/lib/game/skill-theory';
import { SkillQuizModal } from '@/components/skill-tree/SkillQuizModal';

type SkillNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: number;
  xpReward: number;
  prerequisiteIds: string[];
  unlocked: boolean;
  readyToUnlock: boolean;
  practiced: number;
  correct: number;
  progressPct: number;
  recentlyIdentified: boolean;
  keywords?: string[];
};

const CATEGORY_COLORS: Record<string, { dot: string; glow: string; badge: string }> = {
  default:   { dot: 'bg-[var(--accent-cyan)]',    glow: 'var(--glow-cyan)',    badge: 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30' },
  Tenses:    { dot: 'bg-[var(--accent-cyan)]',    glow: 'var(--glow-cyan)',    badge: 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30' },
  Grammar:   { dot: 'bg-[var(--accent-fuchsia)]', glow: 'var(--glow-fuchsia)', badge: 'bg-[var(--accent-fuchsia)]/15 text-[var(--accent-fuchsia)] border-[var(--accent-fuchsia)]/30' },
  Vocabulary:{ dot: 'bg-[var(--accent-emerald)]', glow: 'var(--glow-emerald)', badge: 'bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] border-[var(--accent-emerald)]/30' },
  Fluency:   { dot: 'bg-amber-400',               glow: '0 0 24px rgba(251,191,36,0.5)', badge: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}

function NodeStateIcon({ node }: { node: SkillNode }) {
  if (node.unlocked) return <Check className="w-4 h-4 text-[var(--accent-emerald)]" />;
  if (node.readyToUnlock) return <Sparkles className="w-4 h-4 text-[var(--accent-cyan)] animate-pulse" />;
  return <Lock className="w-3.5 h-3.5 text-white/20" />;
}

function SkillTreeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusedTopic = searchParams.get('topic');
  const didFocusTopic = useRef(false);

  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [userDepth, setUserDepth] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [msgsToNextAudit, setMsgsToNextAudit] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'info' | 'theory'>('info');
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizNode, setQuizNode] = useState<{ slug: string; id: string; title: string } | null>(null);

  const fetchData = useCallback(async (preserveExpanded = false) => {
    try {
      setLoading(true);
      const res = await fetch('/api/skill-tree', { cache: 'no-store' });
      const data = await res.json();
      if (data.nodes) {
        setNodes(data.nodes);
        setUserDepth(data.userDepth ?? 0);
        setUnlockedCount(data.unlockedCount ?? 0);
        setMsgsToNextAudit(typeof data.msgsToNextAudit === 'number' ? data.msgsToNextAudit : null);
        if (!preserveExpanded) {
          const toExpand = new Set<string>();
          (data.nodes as SkillNode[]).forEach((n) => {
            if (n.unlocked || n.readyToUnlock || n.practiced > 0) toExpand.add(n.category);
          });
          if (toExpand.size === 0) {
            const cats = [...new Set((data.nodes as SkillNode[]).map((n: SkillNode) => n.category))];
            cats.slice(0, 2).forEach((c) => toExpand.add(c));
          }
          setExpandedCategories(toExpand);
        }
      }
    } catch {
      toast.error('Failed to load skill tree');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (focusedTopic && !didFocusTopic.current && nodes.length > 0) {
      didFocusTopic.current = true;
      const lc = focusedTopic.toLowerCase().trim();

      // Pass 1 — exact slug match
      let node = nodes.find(n => n.slug === lc || n.slug === lc.replace(/[^a-z0-9]+/g, '-'));

      // Pass 2 — title substring match (case-insensitive)
      if (!node) {
        node = nodes.find(n =>
          n.title.toLowerCase() === lc ||
          n.title.toLowerCase().includes(lc) ||
          lc.includes(n.title.toLowerCase())
        );
      }

      // Pass 3 — keyword match within nodes array (reuses same logic as server-side)
      if (!node) {
        node = nodes.find(n =>
          n.keywords?.some(k =>
            lc.includes(k.toLowerCase()) || k.toLowerCase().includes(lc)
          )
        );
      }

      if (node) {
        setSelectedId(node.id);
        setExpandedCategories(prev => new Set([...prev, node!.category]));
      } else {
        // Custom / dynamic topic — create a synthetic node
        const syntheticId = `synth-${lc}`;
        const prettyTitle = focusedTopic
          .split(/[-_\s]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        setNodes(prev => [...prev, {
          id: syntheticId,
          slug: lc.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          title: prettyTitle,
          description: `A grammar pattern identified in your recent conversations that needs practice.`,
          category: 'Emerging Skills',
          level: 1,
          xpReward: 30,
          prerequisiteIds: [],
          unlocked: true,
          readyToUnlock: false,
          practiced: 1,
          correct: 0,
          progressPct: 0,
          recentlyIdentified: true,
        }]);
        setSelectedId(syntheticId);
        setExpandedCategories(prev => new Set([...prev, 'Emerging Skills']));
      }
    }
  }, [focusedTopic, nodes.length]);

  const categories = useMemo(() => {
    const src = selectedId
      ? nodes.filter(n => n.id === selectedId || n.prerequisiteIds.includes(selectedId))
      : nodes;
    const cats = new Map<string, SkillNode[]>();
    src.forEach(node => {
      if (!cats.has(node.category)) cats.set(node.category, []);
      cats.get(node.category)!.push(node);
    });
    return cats;
  }, [nodes, selectedId]);

  const handleUnlock = useCallback(async (nodeSlug: string, quizScore?: number, quizTotal?: number) => {
    setUnlockingId(nodeSlug);
    try {
      const res = await fetch('/api/skill-tree/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: nodeSlug, quizScore, quizTotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unlock skill');
      await fetchData(true);
      toast.success(`Skill unlocked! +${data.depthBonus}m depth`);
    } catch {
      toast.error('Failed to unlock skill');
    } finally {
      setUnlockingId(null);
    }
  }, [fetchData]);

  const handleOpenQuiz = useCallback((node: SkillNode) => {
    setQuizNode({ slug: node.slug, id: node.id, title: node.title });
    setQuizOpen(true);
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-cyan)]/30 border-t-[var(--accent-cyan)] animate-spin mx-auto mb-4"
            style={{ boxShadow: 'var(--glow-cyan)' }} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
            Loading skill tree...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--foreground)]">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-2xl">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/stats')}
              className="dopamine-button p-2 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white/50" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest glow-cyan leading-none">
                Skill Tree
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25 mt-0.5">
                Grammar mastery map
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--accent-emerald)]/30 bg-[var(--accent-emerald)]/10">
              <Trophy className="w-3 h-3 text-[var(--accent-emerald)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-emerald)]">
                {unlockedCount} unlocked
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10">
              <Zap className="w-3 h-3 text-[var(--accent-cyan)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-cyan)]">
                {userDepth}m
              </span>
            </div>
            {msgsToNextAudit !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5"
                title="Skills update every 10 messages">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  +{msgsToNextAudit} msg{msgsToNextAudit !== 1 ? 's' : ''} to next update
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">

        {/* ── Detail panel ───────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => { setSelectedId(null); setActiveTab('info'); }}
                className="mb-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[var(--accent-cyan)] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to tree
              </button>

              <div className="liquid-glass-strong squircle p-6 overflow-hidden relative">
                {/* Ambient glow behind card */}
                <div
                  className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 pointer-events-none"
                  style={{
                    background: selectedNode.unlocked
                      ? 'radial-gradient(circle, rgba(0,230,118,0.6) 0%, transparent 70%)'
                      : selectedNode.readyToUnlock
                      ? 'radial-gradient(circle, rgba(0,212,212,0.6) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                  }}
                />

                <div className="relative">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-black tracking-tight leading-none mb-2">
                        {selectedNode.title}
                      </h2>
                      <p className="text-sm text-white/40 leading-relaxed">{selectedNode.description}</p>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0">
                      {selectedNode.unlocked ? (
                        <button
                          onClick={() => handleOpenQuiz(selectedNode)}
                          disabled={!!unlockingId}
                          className="dopamine-button flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--accent-emerald)]/40 hover:bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Practice
                        </button>
                      ) : selectedNode.readyToUnlock ? (
                        <button
                          onClick={() => handleOpenQuiz(selectedNode)}
                          disabled={!!unlockingId}
                          className="dopamine-button flex items-center gap-1.5 px-4 py-2 rounded-full bio-cyan text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {unlockingId === selectedNode.slug ? 'Unlocking…' : 'Take Quiz'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest">
                          <Lock className="w-3 h-3" />
                          Locked
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCategoryStyle(selectedNode.category).badge}`}>
                      {selectedNode.category}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/50">
                      Level {selectedNode.level}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]">
                      {selectedNode.xpReward}m depth
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-5 p-1 rounded-2xl bg-white/4 border border-white/6">
                    {(['info', 'theory'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`dopamine-button flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeTab === tab
                            ? 'bio-cyan text-black'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        {tab === 'info' ? <BookOpen className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'info' && (
                      <motion.div
                        key="info"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="space-y-4"
                      >
                        {/* Progress bar */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Progress</span>
                            <span className="text-[10px] font-black text-[var(--accent-cyan)]">
                              {selectedNode.progressPct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[var(--accent-cyan)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, selectedNode.progressPct)}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              style={{ boxShadow: '0 0 8px rgba(0,212,212,0.6)' }}
                            />
                          </div>
                          <p className="text-[10px] text-white/30 mt-1.5">
                            {selectedNode.practiced} attempts · {selectedNode.correct} correct
                          </p>
                        </div>

                        {/* Prerequisites */}
                        {selectedNode.prerequisiteIds.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                              Prerequisites
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedNode.prerequisiteIds.map(id => {
                                const pre = nodes.find(n => n.id === id);
                                return pre ? (
                                  <span
                                    key={id}
                                    className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                      pre.unlocked
                                        ? 'bg-[var(--accent-emerald)]/15 border-[var(--accent-emerald)]/40 text-[var(--accent-emerald)]'
                                        : 'bg-white/5 border-white/10 text-white/30'
                                    }`}
                                  >
                                    {pre.unlocked && <Check className="inline w-2.5 h-2.5 mr-1" />}
                                    {pre.title}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {/* Recently flagged */}
                        {selectedNode.recentlyIdentified && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--accent-fuchsia)]/30 bg-[var(--accent-fuchsia)]/10">
                            <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-fuchsia)] shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-fuchsia)]">
                              Flagged in recent chats — needs practice
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'theory' && (
                      <motion.div
                        key="theory"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <div
                          className="prose prose-invert prose-sm max-w-none text-white/70 [&_h3]:text-[var(--accent-cyan)] [&_h3]:font-black [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-xs [&_strong]:text-white [&_code]:text-[var(--accent-cyan)] [&_code]:bg-[var(--accent-cyan)]/10 [&_code]:px-1 [&_code]:rounded"
                          dangerouslySetInnerHTML={{
                            __html: (() => {
                              const theoryInfo = getTheory(selectedNode.slug);
                              if (!theoryInfo) return '<p>No theory available yet.</p>';
                              return `
                                <h3>Rules</h3>
                                <ul>${theoryInfo.rules.map(r => `<li>${r}</li>`).join('')}</ul>
                                <h3>Examples</h3>
                                <ul style="list-style-type: '💬 ';">${theoryInfo.examples.map(r => `<li>${r}</li>`).join('')}</ul>
                                <h3>Common Mistakes</h3>
                                <ul style="list-style-type: '⚠️ ';">${theoryInfo.commonMistakes.map(r => `<li>${r}</li>`).join('')}</ul>
                                <h3>Tips</h3>
                                <ul style="list-style-type: '💡 ';">${theoryInfo.tips.map(r => `<li>${r}</li>`).join('')}</ul>
                              `;
                            })()
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (

            /* ── Tree view ─────────────────────────────────────────── */
            <motion.div
              key="tree"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Page title */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
                  <span className="glow-cyan">Grammar</span>{' '}
                  <span className="text-white/30">Skills</span>
                </h2>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/25">
                  Tap a node to explore · unlock to practice
                </p>
              </div>

              {categories.size === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full border border-white/10 bg-white/4 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/25">
                    No skill nodes available
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(categories.entries()).map(([category, catNodes], catIdx) => {
                    const style = getCategoryStyle(category);
                    const isOpen = expandedCategories.has(category);
                    const unlockedInCat = catNodes.filter(n => n.unlocked).length;
                    const readyInCat = catNodes.filter(n => n.readyToUnlock).length;

                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: catIdx * 0.06 }}
                        className="liquid-glass squircle overflow-hidden"
                      >
                        {/* Category header */}
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/4 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                              style={{ boxShadow: style.glow }}
                            />
                            <span className="font-black text-sm uppercase tracking-wide truncate">
                              {category}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {unlockedInCat > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/30">
                                  {unlockedInCat}✓
                                </span>
                              )}
                              {readyInCat > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 animate-pulse">
                                  {readyInCat} ready
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/25">
                              {catNodes.length} nodes
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-white/30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        {/* Node grid */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {catNodes.map((node, nodeIdx) => (
                                  <motion.div
                                    key={node.id}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: nodeIdx * 0.04 }}
                                    onClick={() => setSelectedId(node.id)}
                                    className={`
                                      relative group cursor-pointer rounded-2xl p-4 border transition-all duration-200
                                      hover:scale-[1.02] hover:-translate-y-0.5
                                      ${node.unlocked
                                        ? 'bg-[var(--accent-emerald)]/8 border-[var(--accent-emerald)]/25 hover:border-[var(--accent-emerald)]/50'
                                        : node.readyToUnlock
                                        ? 'bg-[var(--accent-cyan)]/8 border-[var(--accent-cyan)]/25 hover:border-[var(--accent-cyan)]/50'
                                        : 'bg-white/3 border-white/8 hover:border-white/16'
                                      }
                                    `}
                                    style={node.unlocked
                                      ? { boxShadow: 'inset 0 1px 0 rgba(0,230,118,0.08)' }
                                      : node.readyToUnlock
                                      ? { boxShadow: 'inset 0 1px 0 rgba(0,212,212,0.08)' }
                                      : undefined
                                    }
                                  >
                                    {/* Hot glow for ready nodes */}
                                    {node.readyToUnlock && (
                                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                        style={{ boxShadow: 'inset 0 0 20px rgba(0,212,212,0.1)' }} />
                                    )}

                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="font-black text-sm leading-tight">{node.title}</h4>
                                      <NodeStateIcon node={node} />
                                    </div>

                                    <p className="text-[11px] text-white/35 leading-relaxed mb-3 line-clamp-2">
                                      {node.description}
                                    </p>

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/6 text-white/40 border border-white/8">
                                          Lv.{node.level}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--accent-cyan)]/12 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/25">
                                          +{node.xpReward}m
                                        </span>
                                        {node.recentlyIdentified && (
                                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--accent-fuchsia)]/15 text-[var(--accent-fuchsia)] border border-[var(--accent-fuchsia)]/30">
                                            ⚡ Weak
                                          </span>
                                        )}
                                      </div>

                                      {/* Mini progress bar */}
                                      {node.practiced > 0 && (
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-[var(--accent-cyan)]"
                                              style={{ width: `${node.progressPct}%`, boxShadow: '0 0 4px rgba(0,212,212,0.6)' }}
                                            />
                                          </div>
                                          <span className="text-[9px] font-black text-white/25">
                                            {node.progressPct}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {quizNode && (
        <SkillQuizModal
          isOpen={quizOpen}
          nodeSlug={quizNode.slug}
          nodeTitle={quizNode.title}
          onClose={() => setQuizOpen(false)}
          onPassed={(score, total) => {
            setQuizOpen(false);
            void handleUnlock(quizNode.slug, score, total);
          }}
        />
      )}
    </div>
  );
}

export default function SkillTreePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-cyan)]/30 border-t-[var(--accent-cyan)] animate-spin"
          style={{ boxShadow: 'var(--glow-cyan)' }} />
      </div>
    }>
      <SkillTreeContent />
    </Suspense>
  );
}
