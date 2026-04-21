'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme-context';
import { track } from '@/lib/services/analytics';
import { toast } from 'sonner';

import { useReelGenerator, ReelMessage, ReelType } from '@/hooks/useReelGenerator';
import { Step, Platform, PLATFORM_CAPTIONS, REEL_TYPES } from './reel-modal/constants';
import { ReelTypePicker } from './reel-modal/ReelTypePicker';
import { ReelPreview } from './reel-modal/ReelPreview';
import { ReelGenerating } from './reel-modal/ReelGenerating';
import { ReelShare } from './reel-modal/ReelShare';

interface Props {
  messages: ReelMessage[];
  persona: { name: string; avatarUrl?: string | null; voiceId?: string | null };
  diveDepth?: number;
  sessionCount?: number;
  onClose: () => void;
}

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 };

export function VideoReelModal({ messages, persona, diveDepth = 0, sessionCount = 1, onClose }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [step, setStep] = useState<Step>('picker');
  const [selectedType, setSelectedType] = useState<ReelType | null>(null);
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [caption, setCaption] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing'>('idle');

  const {
    genStage,
    genProgress,
    videoUrl,
    webmBlob,
    mp4Blob,
    canvasRef,
    startGeneration,
    reset,
  } = useReelGenerator({ messages, persona, diveDepth });

  // Compute available types
  const availableTypes = REEL_TYPES.filter(t => {
    if (t.minMessages && messages.length < t.minMessages) return false;
    if (t.minSessions && sessionCount < t.minSessions) return false;
    return true;
  });

  const recommendedType = (() => {
    if (sessionCount >= 3) return 'PROPHECY';
    const worstMsg = messages.find(m => m.sender === 'USER' && m.weaknessIdentified);
    if (worstMsg) return 'ROAST';
    if (diveDepth > 10) return 'FLEX';
    return 'MIRROR';
  })() as ReelType;

  // Auto-fill captions
  useEffect(() => {
    if (!selectedType) return;
    let draft = PLATFORM_CAPTIONS[selectedType][platform];
    const worstMsg = messages.find(m => m.sender === 'USER' && m.weaknessIdentified);
    draft = draft
      .replace('[worst_sentence]', worstMsg?.text?.slice(0, 60) || 'my sentence was rough')
      .replace('[depth]', String(diveDepth))
      .replace('[level]', diveDepth < 10 ? 'A1' : diveDepth < 30 ? 'A2' : diveDepth < 60 ? 'B1' : 'B2')
      .replace('[timeframe]', sessionCount > 10 ? `${sessionCount} sessions` : 'a few sessions')
      .replace('[prediction_1]', 'you avoid past tense when nervous')
      .replace('[prediction_2]', 'you use "basically" to buy thinking time')
      .replace('[actual_level]', diveDepth < 20 ? '"beginner"' : '"intermediate"');
    setCaption(draft);
  }, [selectedType, platform, messages, diveDepth, sessionCount]);

  // Stage transition hook
  useEffect(() => {
    if (genStage === 'analyzing') setStep('generating');
    if (genStage === 'ready') setStep('share');
  }, [genStage]);

  const selectType = (type: ReelType) => {
    setSelectedType(type);
    setStep('preview');
  };

  const onGenerate = () => {
    if (selectedType) {
      startGeneration(selectedType);
    }
  };

  const onRedo = () => {
    reset();
    setStep('picker');
  };

  const handleShareWrapper = async (targetPlatform?: Platform) => {
    const blob = mp4Blob || webmBlob;
    if (!blob) return;
    setShareStatus('sharing');

    const filename = `aura-reel-${selectedType?.toLowerCase()}-${Date.now()}.${mp4Blob ? 'mp4' : 'webm'}`;
    const file = new File([blob], filename, { type: blob.type });

    try {
      if (targetPlatform === 'twitter') {
        const text = encodeURIComponent(caption.slice(0, 280));
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
      } else if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }
    } catch {}

    setShareStatus('idle');
  };

  const handleSaveVideo = () => {
    const blob = mp4Blob || webmBlob;
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aura-reel-${Date.now()}.${mp4Blob ? 'mp4' : 'webm'}`;
    a.click();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=reel&type=${selectedType}`);
    toast.success('Link copied');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <motion.div
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 500, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 150 || velocity.y > 500) {
            onClose();
          }
        }}
        className="w-full max-w-lg rounded-t-[40px] overflow-hidden flex flex-col mx-auto"
        style={{
          background: isDark ? 'rgba(10,12,20,0.85)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
          borderBottom: 'none',
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 -20px 80px rgba(0,0,0,0.6)'
            : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -16px 40px rgba(0,0,0,0.15)',
          maxHeight: '92dvh',
        }}
      >
        <div className="w-full h-5 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing pb-2 pt-3">
          <div className="w-12 h-1.5 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
        </div>

        <div className="flex items-center justify-between px-5 py-2 shrink-0">
          <div>
            {step === 'picker' && (
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                Turn session into a reel →
              </p>
            )}
            {step === 'preview' && selectedType && (
              <button onClick={() => setStep('picker')} className="flex items-center gap-1 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                ← Back
              </button>
            )}
            {step === 'share' && (
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#00d4d4' }}>
                Ready to drop ▼
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
            <X className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {step === 'picker' && (
              <ReelTypePicker
                availableTypes={availableTypes}
                recommendedType={recommendedType}
                onSelectType={selectType}
                SPRING={SPRING}
              />
            )}
            {step === 'preview' && selectedType && (
              <ReelPreview
                selectedType={selectedType}
                messages={messages}
                persona={persona as any}
                onGenerate={onGenerate}
                SPRING={SPRING}
              />
            )}
            {step === 'generating' && (
              <ReelGenerating
                genStage={genStage}
                genProgress={genProgress}
                SPRING={SPRING}
              />
            )}
            {step === 'share' && selectedType && videoUrl && (
              <ReelShare
                selectedType={selectedType}
                videoUrl={videoUrl}
                webmBlob={webmBlob}
                mp4Blob={mp4Blob}
                caption={caption}
                setCaption={setCaption}
                platform={platform}
                setPlatform={setPlatform}
                shareStatus={shareStatus}
                handleShareWrapper={handleShareWrapper}
                handleSaveVideo={handleSaveVideo}
                handleCopyLink={handleCopyLink}
                onRedo={onRedo}
                SPRING={SPRING}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
