'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';

interface CyberAudioPlayerProps {
  message: string;
  voiceId?: string | null;
}

export function CyberAudioPlayer({ message }: CyberAudioPlayerProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handleToggle = async () => {
    if (state === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setState('idle');
      return;
    }

    if (state === 'loading') return;

    try {
      setState('loading');
      
      const cleanMessage = message.replace(/https?:\/\/\S+/g, 'link').replace(/[*_~`]/g, '');
      
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanMessage })
      });

      if (!res.ok) throw new Error('TTS API failed');

      const data = await res.json();
      if (!data.results || data.results.length === 0) throw new Error('No audio returned');

      const b64Chunks = data.results.map((r: any) => r.base64);
      
      let currentIndex = 0;

      const playNext = async () => {
        if (currentIndex >= b64Chunks.length) {
          setState('idle');
          return;
        }

        try {
          const audio = new Audio(`data:audio/mp3;base64,${b64Chunks[currentIndex]}`);
          audioRef.current = audio;
          audio.onplay = () => setState('playing');
          audio.onended = () => {
            currentIndex++;
            playNext();
          };
          audio.onerror = () => {
            console.warn('[TTS] playback error', currentIndex);
            currentIndex++;
            playNext();
          };
          await audio.play();
        } catch (err) {
          console.warn('[TTS] play failed:', err);
          setState('error');
        }
      };

      await playNext();
    } catch (err) {
      console.error('[TTS] setup error:', err);
      setState('error');
      
      // Fallback to Web Speech API
      try {
        const cleanMessage = message.replace(/https?:\/\/\S+/g, 'link').replace(/[*_~`]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanMessage);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        
        utterance.onstart = () => setState('playing');
        utterance.onend = () => setState('idle');
        utterance.onerror = () => setState('error');
        
        window.speechSynthesis.speak(utterance);
      } catch (fallbackErr) {
        console.error('Fallback TTS failed', fallbackErr);
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        relative overflow-hidden
        h-7 w-7 rounded-full 
        transition-all duration-200 ease-out
        flex items-center justify-center
        ${state === 'playing'
          ? 'bg-[var(--accent-cyan)]/12 text-[var(--accent-cyan)]'
          : 'bg-transparent hover:bg-white/8 text-white/45 hover:text-white/75'
        }
      `}
      title={state === 'playing' ? "Stop playback" : "Listen to message"}
    >
      {state === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 text-[var(--accent-cyan)] animate-spin" />
      ) : state === 'playing' ? (
        <Square className="w-3.5 h-3.5 text-[var(--accent-cyan)] fill-current animate-pulse" />
      ) : (
        <Volume2 className={`w-3.5 h-3.5 ${state === 'error' ? 'text-red-400' : ''}`} />
      )}
      
      {state === 'playing' && (
        <div className="absolute inset-0 rounded-full bg-[var(--accent-cyan)]/10 animate-ping opacity-40" />
      )}
    </button>
  );
}
// trigger recompile
