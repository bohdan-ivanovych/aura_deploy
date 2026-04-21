'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

interface UseSpeechInputOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
}

interface SpeechInputResult {
  status: SpeechStatus;
  interimText: string;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  error: string | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useSpeechInput({
  lang = 'en-US',
  continuous = true,
  interimResults = true,
  onTranscript,
  onError,
}: UseSpeechInputOptions = {}): SpeechInputResult {
  const [status, setStatus]           = useState<SpeechStatus>('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError]             = useState<string | null>(null);
  const recognitionRef                = useRef<SpeechRecognition | null>(null);
  const isManualStopRef               = useRef(false);

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const createRecognition = useCallback(() => {
    if (!isSupported) return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setStatus('listening');
      setError(null);
      setInterimText('');
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const finalText = result[0].transcript;
          onTranscript?.(finalText, true);
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      let msg = 'Microphone error';
      switch (event.error) {
        case 'not-allowed':
          msg = 'Microphone access denied. Please allow microphone permissions.';
          break;
        case 'no-speech':
          msg = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          msg = 'No microphone found. Check your device.';
          break;
        case 'network':
          msg = 'Network error during recognition.';
          break;
        case 'aborted':
          return;
        default:
          msg = `Recognition error: ${event.error}`;
      }
      setError(msg);
      setStatus('error');
      setInterimText('');
      onError?.(msg);
    };

    rec.onend = () => {
      setInterimText('');
      if (!isManualStopRef.current) {
        setStatus('idle');
      } else {
        setStatus('idle');
        isManualStopRef.current = false;
      }
    };

    return rec;
  }, [lang, continuous, interimResults, onTranscript, onError, isSupported]);

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported');
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    if (status === 'listening') return;

    const rec = createRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    isManualStopRef.current = false;

    try {
      rec.start();
    } catch (e) {
      setError('Could not start microphone. Please try again.');
      setStatus('error');
    }
  }, [isSupported, status, createRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      isManualStopRef.current = true;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setInterimText('');
    setStatus('idle');
  }, []);

  const toggle = useCallback(() => {
    if (status === 'listening') stop();
    else start();
  }, [status, start, stop]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { status, interimText, isSupported, start, stop, toggle, error };
}
