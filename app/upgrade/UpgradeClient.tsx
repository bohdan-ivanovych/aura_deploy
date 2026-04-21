'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Zap, MessageSquare, Users, Mic, Film, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { track } from '@/lib/services/analytics'
import { useTheme } from '@/lib/contexts/theme-context'

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 }

const freeFeatures = [
  '20 messages per day',
  '1 AI persona',
  '1 reel per day',
  'Flashcard review',
  'Skill tree progress',
]

const proFeatures = [
  'Unlimited messages',
  'All AI personas + custom',
  'Unlimited reels',
  'Multiplayer rooms',
  'AI voice mode',
  'Priority support',
]

export default function UpgradeClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const isDark = theme !== 'light'

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    track('upgrade_clicked', { source: 'upgrade_page' })
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      if (data.url) window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Immersive background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: 'var(--accent-cyan)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: 'var(--accent-fuchsia)' }} />

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 pb-24 md:pb-12"
        style={{ paddingTop: 'max(2.5rem, calc(2rem + env(safe-area-inset-top, 0px)))', zIndex: 10 }}>

        <Link href="/chat" className="inline-flex items-center gap-2 mb-10 text-[11px] font-bold uppercase tracking-[0.15em] transition-opacity hover:opacity-70" style={{ color: 'var(--foreground-muted)' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to chat
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-14">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[9px] font-black uppercase tracking-[0.3em] liquid-glass"
            style={{ 
              border: '1px solid var(--border)', 
              color: 'var(--foreground)',
              boxShadow: '0 0 20px rgba(0,212,212,0.1)' 
            }}>
            <Zap className="w-3 h-3 text-[var(--accent-cyan)]" />
            Aura Premium
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className={`text-5xl sm:text-6xl font-black tracking-tighter mb-4 ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60' : 'text-black'}`}
          >
            Go deeply beyond.
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="text-base sm:text-lg max-w-md mx-auto" style={{ color: 'var(--foreground-muted)' }}>
            Elevate your conversational depth with infinite interactions, all personas, and absolute voice immersion.
          </motion.p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12 max-w-3xl mx-auto">
          
          {/* Free Tier */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: 0.15 }}
            whileHover={{ y: -4 }}
            className="rounded-[2.5rem] p-8 flex flex-col relative liquid-glass shadow-none"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--foreground-muted)' }}>Basic</div>
            <div className="text-4xl font-black mb-8" style={{ color: 'var(--foreground)' }}>$0<span className="text-sm font-semibold opacity-40">/mo</span></div>
            <div className="space-y-4 flex-1">
              {freeFeatures.map(f => (
                <div key={f} className="flex items-start gap-3 text-[13px] font-medium" style={{ color: 'var(--foreground-subtle)' }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0 opacity-40 text-current" />
                  {f}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro Tier (Highlighted) */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: 0.2 }}
            className="rounded-[2.5rem] p-8 relative flex flex-col liquid-glass-strong shadow-2xl"
            style={{ border: '1px solid var(--border)' }}
          >
            {/* Animated glowing border wrapper */}
            <div className="absolute inset-0 rounded-[2.5rem] p-[1px] -z-10" style={{ background: isDark ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-fuchsia))' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-fuchsia))', opacity: isDark ? 1 : 0.6 }} />
            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-fuchsia)] opacity-20 blur-xl -z-20 animate-pulse" />

            <div className="absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em]"
              style={{ background: 'rgba(0,212,212,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,212,0.3)' }}>
              Limitless
            </div>
            
            <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--accent-cyan)' }}>Aura Pro</div>
            <div className="mb-8">
              <span className={`text-4xl font-black ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70' : 'text-black'}`}>$9.99</span>
              <span className="text-sm font-semibold opacity-50 ml-1" style={{ color: 'var(--foreground)' }}>/mo</span>
              <p className="text-[10px] font-semibold mt-2 opacity-60" style={{ color: 'var(--foreground-muted)' }}>Cancel absolutely anytime.</p>
            </div>
            
            <div className="space-y-4 flex-1">
              {proFeatures.map(f => (
                <div key={f} className="flex items-start gap-3 text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(0,212,212,0.15)' }}>
                    <Check className="w-2.5 h-2.5" style={{ color: 'var(--accent-cyan)' }} />
                  </div>
                  {f}
                </div>
              ))}
            </div>

            <motion.button
              onClick={handleUpgrade}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
              className="w-full mt-8 py-4 px-6 rounded-2xl font-black text-[13px] uppercase tracking-[0.1em] text-white disabled:opacity-50 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #00d4d4, #0098db)',
                boxShadow: '0 12px 32px rgba(0,212,212,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Preparing...
                </span>
              ) : 'Unlock Pro Access'}
            </motion.button>
          </motion.div>
        </div>

        {error && (
          <p className="text-center text-xs font-bold mb-8 px-4 py-3 rounded-xl mx-auto max-w-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        {/* Feature Carousel Preview */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-16 pb-8">
          {[
            { icon: MessageSquare, label: 'Infinite Chats', color: 'var(--accent-cyan)' },
            { icon: Mic, label: 'Voice Mode', color: 'var(--accent-fuchsia)' },
            { icon: Film, label: 'Unlimited Reels', color: '#f59e0b' },
            { icon: Users, label: 'All Personas', color: '#34d399' },
          ].map(({ icon: Icon, label, color }, i) => (
            <motion.div 
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.4 + (i * 0.05) }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center liquid-glass"
                style={{ border: '1px solid var(--border)' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center" style={{ color: 'var(--foreground-muted)' }}>
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
