'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, Plus, Check } from 'lucide-react';
import { haptics } from '@/lib/utils/haptics';
import { toast } from 'sonner';
import { useTheme } from '@/lib/contexts/theme-context';
import { addCallGrammarToLearningList } from '@/app/actions/learning-list';

type CallState = 'idle' | 'listening' | 'processing' | 'speaking';

interface CallExchange {
  userText: string;
  aiText: string;
  audioDuration: number;
}

interface GrammarHint {
  mistake: string;
  correction: string;
  tip: string;
}

interface CallScreenProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  personaId: string;
  personaName: string;
  personaColor?: string;
  onCallEnd?: (exchanges: CallExchange[]) => void;
  isPro?: boolean;
  currentHP?: number;
  currentDepth?: number;
}

const PERSONA_COLORS: Record<string, string> = {
  Ryan: '#2D9CDB',
  Sophie: '#9B51E0',
  Carlos: '#F2994A',
  Yuki: '#27AE60',
};

const CANNED_INTERRUPTS = [
  'Take your time.',
  'Still there?',
  "I'm listening.",
  'No rush.',
];

const FREE_MINUTES = 10;

function PersonaSphere({ state, color }: { state: CallState; color: string }) {
  return (
    <div className="relative flex flex-col items-center gap-4">
      <motion.div
        className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center"
        animate={
          state === 'idle'
            ? { scale: [0.96, 1.0, 0.96] }
            : state === 'listening'
            ? { scale: [1.0, 1.04, 1.0] }
            : state === 'processing'
            ? { scale: 0.92 }
            : { scale: [1.0, 1.12, 1.0] }
        }
        transition={
          state === 'processing'
            ? { duration: 0.3 }
            : { duration: state === 'idle' ? 3 : 1.2, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{
          background:
            state === 'listening'
              ? `radial-gradient(circle, #48B8F0 0%, ${color} 60%, #0E1623 100%)`
              : `radial-gradient(circle, ${color} 0%, #0E1623 100%)`,
          boxShadow:
            state === 'listening'
              ? `0 0 60px rgba(72,184,240,0.5), 0 0 120px rgba(72,184,240,0.2)`
              : state === 'speaking'
              ? `0 0 60px ${color}80, 0 0 120px ${color}30`
              : `0 0 40px ${color}50`,
          opacity: state === 'processing' ? 0.7 : 1,
        }}
      >
        {/* Spinning ring for processing */}
        {state === 'processing' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${color} 0deg, transparent 270deg)`,
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), white calc(100% - 4px))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), white calc(100% - 4px))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Inner glow pulse */}
        <div
          className="w-16 h-16 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Waveform bars for listening */}
      <AnimatePresence>
        {state === 'listening' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-end gap-1"
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                style={{ background: color }}
                animate={{ height: ['6px', '18px', '8px', '14px', '6px'] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CallTimer({ startTime, isPro, callMinutesLeft }: { startTime: number; isPro: boolean; callMinutesLeft: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (isPro) {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    );
  }

  const totalFreeSeconds = FREE_MINUTES * 60;
  const remaining = Math.max(0, totalFreeSeconds - elapsed);
  const remMins = Math.floor(remaining / 60);
  const remSecs = remaining % 60;
  const isLow = remaining < 120;

  return (
    <span
      className="font-mono text-sm font-bold"
      style={{ color: isLow ? '#ef4444' : 'rgba(255,255,255,0.5)' }}
    >
      {String(remMins).padStart(2, '0')}:{String(remSecs).padStart(2, '0')}
    </span>
  );
}

// Ensure the Error Toast floats natively on mobile
export function CallScreen({
  isOpen,
  onClose,
  sessionId,
  personaId,
  personaName,
  personaColor,
  onCallEnd,
  isPro = false,
  currentHP = 100,
  currentDepth = 0,
}: CallScreenProps) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const color = personaColor || PERSONA_COLORS[personaName] || '#2D9CDB';
  const [callState, setCallState] = useState<CallState>('idle');
  const [transcript, setTranscript] = useState('');
  const [callMinutesLeft, setCallMinutesLeft] = useState(FREE_MINUTES);
  const [exchanges, setExchanges] = useState<CallExchange[]>([]);
  const [callStartTime] = useState(Date.now());
  const [isHolding, setIsHolding] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [ttsUnlocked, setTtsUnlocked] = useState(false);
  
  const [grammarHint, setGrammarHint] = useState<GrammarHint | null>(null);
  const [hintDismissTimer, setHintDismissTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [addedToList, setAddedToList] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdStartRef = useRef<number>(0);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const unlockTTS = useCallback(() => {
    if (ttsUnlocked) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(u);
      setTtsUnlocked(true);
    }
  }, [ttsUnlocked]);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Neural') || v.name.includes('Premium') || v.name.includes('Enhanced'))
    ) || voices.find(v => v.lang.startsWith('en-US'));
    if (englishVoice) utter.voice = englishVoice;

    utter.onstart = () => setCallState('speaking');
    utter.onend = () => {
      setCallState('idle');
      setTranscript('');
    };
    utter.onerror = () => setCallState('idle');

    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const sendAudioToServer = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob.size) return;

    setCallState('processing');
    haptics.light();

    try {
      const formData = new FormData();
      const mimeType = audioBlob.type || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', audioBlob, `recording.${ext}`);
      formData.append('sessionId', sessionId);

      const transcribeRes = await fetch('/api/call/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        toast.error('Transcription failed');
        setCallState('idle');
        return;
      }

      const { text: userText } = await transcribeRes.json();
      if (!userText?.trim()) {
        setCallState('idle');
        return;
      }

      setTranscript(userText);

      const respondRes = await fetch('/api/call/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, sessionId, personaId }),
      });

      if (!respondRes.ok) {
        const err = await respondRes.json();
        if (err.error === 'daily_call_limit') {
          toast.error('Free call limit reached. Upgrade for unlimited calls.');
          onClose();
          return;
        }
        toast.error(err.error || 'AI response failed');
        setCallState('idle');
        return;
      }

      const rawJson = await respondRes.json();
      const { reply, callMinutesLeft: minutesLeft, errorSpan, grammarCorrection } = rawJson;
      
      if (minutesLeft !== undefined) setCallMinutesLeft(minutesLeft);

      setExchanges(prev => [...prev, {
        userText,
        aiText: reply,
        audioDuration: Math.ceil(userText.split(' ').length * 0.4),
      }]);

      setTranscript(reply);
      speakText(reply);

      // UI Toast for Gordon Ramsay grammar burn
      if (errorSpan && errorSpan.original && errorSpan.corrected) {
        setGrammarHint({
          mistake: errorSpan.original,
          correction: errorSpan.corrected,
          tip: grammarCorrection || 'Incorrect grammar',
        });
        setAddedToList(false); // reset state

        // Auto-dismiss the toast after 6s
        if (hintDismissTimer) clearTimeout(hintDismissTimer);
        const timer = setTimeout(() => {
          setGrammarHint(null);
        }, 6000);
        setHintDismissTimer(timer);
      }

    } catch (err) {
      console.error('Call error:', err);
      toast.error('Connection error. Please try again.');
      setCallState('idle');
    }
  }, [sessionId, personaId, speakText, onClose, hintDismissTimer]);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await sendAudioToServer(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setCallState('listening');
      haptics.medium();
    } catch (err) {
      console.error('Mic error:', err);
      toast.error('Microphone access denied. Please allow mic permissions in your browser settings.');
      setCallState('idle');
    }
  }, [sendAudioToServer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    haptics.light();
  }, []);

  // --- Walkie-Talkie UX ---
  // Hold > 300ms = Push to Talk
  // Tap < 300ms = Tap to Toggle lock
  const handleHoldStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (callState === 'processing' || callState === 'speaking') return;

    unlockTTS();
    holdStartRef.current = Date.now();

    if (isRecordingLocked) {
      // If already locked, tapping again stops it
      setIsRecordingLocked(false);
      setIsHolding(false);
      stopRecording();
      return;
    }

    setIsHolding(true);
    startRecording();

    // Canned interrupt after 8s of holding
    setTimeout(() => {
      // (Only check state via ref or assume if they're still holding 8s later)
      if (mediaRecorderRef.current?.state === 'recording') {
        const line = CANNED_INTERRUPTS[Math.floor(Math.random() * CANNED_INTERRUPTS.length)];
        speakText(line);
        haptics.light();
      }
    }, 8_000);
  }, [callState, unlockTTS, isRecordingLocked, startRecording, stopRecording, speakText]);

  const handleHoldEnd = useCallback(() => {
    if (!isHolding && !isRecordingLocked) return;

    const duration = Date.now() - holdStartRef.current;
    
    // Tap to Toggle
    if (duration < 300 && !isRecordingLocked) {
      setIsRecordingLocked(true);
      return; // Keep recording going
    }

    // Otherwise, release stops the walkie-talkie
    if (isRecordingLocked) {
      // Do nothing, they are tap-locked and just touched it briefly? 
      // Wait, if they tapped again, handleHoldStart stopped it.
      return;
    }

    setIsHolding(false);
    stopRecording();
  }, [isHolding, isRecordingLocked, stopRecording]);

  const handleEndCall = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    haptics.heavy();
    onCallEnd?.(exchanges);
    onClose();
  }, [exchanges, onCallEnd, onClose]);

  const handleAddLearningList = async () => {
    if (!grammarHint) return;
    setIsAddingToList(true);
    haptics.light();
    try {
      await addCallGrammarToLearningList(
        grammarHint.mistake, 
        grammarHint.correction, 
        grammarHint.tip, 
        sessionId
      );
      setAddedToList(true);
      toast.success('Added to Learning List!');
      setTimeout(() => setGrammarHint(null), 1500); // clear toast shortly after
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setIsAddingToList(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hintDismissTimer) clearTimeout(hintDismissTimer);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [hintDismissTimer]);

  if (!isOpen || !mounted) return null;

  const showActiveRecording = isHolding || isRecordingLocked;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ 
        background: isDark ? 'rgba(8,12,24,0.65)' : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(45px) saturate(220%)',
        WebkitBackdropFilter: 'blur(45px) saturate(220%)',
      }}
    >
      {/* Ambient radial glow behind sphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 45%, ${color}${isDark ? '25' : '15'} 0%, transparent 70%)`,
        }}
      />

      {/* ─ Top status bar ─ */}
      <div
        className="flex items-center justify-between px-6 z-10 shrink-0"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}
      >
        {/* Timer pill */}
        <div
          className="px-3 py-1.5 rounded-full"
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', 
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}` 
          }}
        >
          <CallTimer startTime={callStartTime} isPro={isPro} callMinutesLeft={callMinutesLeft} />
        </div>

        {/* Persona name */}
        <span className="text-sm font-black uppercase tracking-widest" style={{ color: `${color}dd` }}>
          {personaName}
        </span>

        {/* Stats pill */}
        <div
          className="px-3 py-1.5 rounded-full font-mono text-[11px] font-bold"
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', 
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`, 
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' 
          }}
        >
          ♥{currentHP}
        </div>
      </div>

      {/* ─ Grammar hint toast ─ */}
      <AnimatePresence>
        {grammarHint && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute z-50 left-4 right-4 mt-20 p-4 rounded-3xl border shadow-2xl"
            style={{
              top: 'env(safe-area-inset-top)',
              background: isDark ? 'rgba(14,22,35,0.8)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(30px)',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.2)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 40px rgba(239, 68, 68, 0.1)',
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-[#ef4444] font-bold">Mistake</span>
                <p className="text-sm line-through text-white/50">{grammarHint.mistake}</p>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-[#27AE60] font-bold">Correction</span>
                <p className="text-sm font-medium text-white">{grammarHint.correction}</p>
              </div>
              
              <p className="text-xs text-white/70 italic bg-white/5 p-2 rounded-xl border border-white/10 mt-1">
                "{grammarHint.tip}"
              </p>

              <button 
                onClick={handleAddLearningList}
                disabled={isAddingToList || addedToList}
                className="mt-2 w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: addedToList ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.1)',
                  borderColor: addedToList ? 'rgba(39, 174, 96, 0.5)' : 'rgba(255,255,255,0.1)',
                  color: addedToList ? '#27AE60' : 'white',
                }}
              >
                {addedToList ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-bold">Added</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold">{isAddingToList ? 'Adding...' : 'Add to Learning List'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─ Main content ─ */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">

        {/* Persona Sphere */}
        <PersonaSphere state={callState} color={color} />

        {/* Transcript */}
        <AnimatePresence mode="wait">
          {transcript ? (
            <motion.p
              key={transcript}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center text-sm font-medium max-w-[280px] leading-relaxed"
              style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
            >
              {transcript.length > 120 ? transcript.slice(0, 120) + '…' : transcript}
            </motion.p>
          ) : (
            <motion.p
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-[13px] tracking-wide"
              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
            >
              {callState === 'idle' ? 'Hold or Tap to speak'
                : callState === 'listening' ? (isRecordingLocked ? 'Tap to send' : 'Listening...')
                : callState === 'processing' ? 'Processing...'
                : 'Speaking...'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ─ Bottom controls ─ */}
      <div className="pb-[calc(env(safe-area-inset-bottom,20px)+24px)] flex flex-col items-center gap-6 relative z-10 shrink-0">
        
        {/* Hold to speak button */}
        <motion.button
          onPointerDown={handleHoldStart}
          onPointerUp={handleHoldEnd}
          onPointerCancel={handleHoldEnd}
          onPointerLeave={handleHoldEnd}
          whileTap={{ scale: 0.94 }}
          disabled={callState === 'speaking' || isRecordingLocked}
          className={`relative w-[88px] h-[88px] rounded-full flex items-center justify-center transition-opacity ${
            (callState === 'speaking' || isRecordingLocked) ? 'opacity-40' : 'opacity-100'
          }`}
          style={{
            background: showActiveRecording
              ? '#ef4444'
              : callState === 'processing'
              ? 'rgba(255,255,255,0.1)'
              : `linear-gradient(135deg, ${color} 0%, #0098db 100%)`,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            backdropFilter: 'blur(20px)',
            boxShadow: showActiveRecording
              ? '0 0 40px rgba(239,68,68,0.5)'
              : callState === 'processing'
              ? 'none'
              : `0 0 30px ${color}60`,
            cursor: callState === 'processing' ? 'not-allowed' : 'pointer',
          }}
        >
          {showActiveRecording ? (
            <motion.div
              className={`w-3 h-3 rounded-full bg-white ${isRecordingLocked ? 'animate-pulse' : ''}`}
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ) : callState === 'processing' ? (
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Mic className="w-7 h-7 text-white" />
          )}
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.p
            key={isRecordingLocked ? 'locked' : 'unlocked'}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] uppercase tracking-widest"
            style={{ color: isRecordingLocked ? '#ef4444' : 'rgba(255,255,255,0.2)' }}
          >
            {isRecordingLocked ? 'Mic Locked — Tap to send' : (isHolding ? 'Release to send' : 'Hold or Tap')}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ─ Bottom bar: End Call ─ */}
      <div
        className="flex items-center justify-center pb-[max(32px,env(safe-area-inset-bottom,24px))] pt-6"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <button onClick={handleEndCall} className="flex flex-col items-center gap-2">
          <motion.div
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 30px rgba(239,68,68,0.45)' }}
          >
            <PhoneOff className="w-6 h-6 text-white" style={{ transform: 'rotate(135deg)' }} />
          </motion.div>
          <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>End Call</span>
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
