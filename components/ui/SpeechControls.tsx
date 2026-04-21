'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { azureSpeechService } from '@/lib/services/azure-speech';

interface SpeechControlsProps {
  onTranscript: (text: string) => void;
  onSpeak: (text: string) => void;
  disabled?: boolean;
}

export function SpeechControls({ onTranscript, onSpeak, disabled }: SpeechControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition && azureSpeechService.isConfigured());
  }, []);

  const startListening = () => {
    if (!speechSupported || disabled) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (event.results[0].isFinal) {
        onTranscript(transcript);
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const speakText = async (text: string) => {
    if (!azureSpeechService.isConfigured() || disabled) return;
    
    try {
      setIsSpeaking(true);
      await azureSpeechService.speakText(text);
      onSpeak(text);
    } catch (error) {
      console.error('Speech synthesis error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (!speechSupported) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Microphone button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`p-2 rounded-xl transition-all ${
          isListening 
            ? 'bg-red-500 text-white' 
            : 'bg-[var(--surface)] text-[var(--foreground)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          boxShadow: isListening ? '0 0 20px rgba(239,68,68,0.4)' : undefined
        }}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </motion.button>

      {/* Visual feedback when listening */}
      {isListening && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-4 rounded-full bg-red-500"
              animate={{ 
                scaleY: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5] 
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
