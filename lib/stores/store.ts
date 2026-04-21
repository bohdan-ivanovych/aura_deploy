import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect } from 'react';
import { ChatSession, Flashcard, Settings } from '../types';

const isServer = typeof window === 'undefined';

const serverStorage = {
  getItem: (_name: string): null => null,
  setItem: (_name: string, _value: string): void => {},
  removeItem: (_name: string): void => {},
};

const safeLocalStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

interface AppStore {
  chatSessions: ChatSession[];
  setChatSessions: (sessions: ChatSession[]) => void;
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  deleteChatSession: (sessionId: string) => void;

  flashcards: Flashcard[];
  setFlashcards: (cards: Flashcard[]) => void;
  addFlashcard: (card: Flashcard) => void;
  updateFlashcard: (cardId: string, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (cardId: string) => void;

  selectedChatSessionId: string | null;
  setSelectedChatSessionId: (id: string | null) => void;

  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      chatSessions: [],
      setChatSessions: (sessions) => set({ chatSessions: sessions }),
      addChatSession: (session) =>
        set((state) => {
          const exists = state.chatSessions.some(s => s.id === session.id);
          if (exists) return state;
          return { chatSessions: [session, ...state.chatSessions] };
        }),
      updateChatSession: (sessionId, updates) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s,
          ),
        })),
      deleteChatSession: (sessionId) =>
        set((state) => ({
          chatSessions: state.chatSessions.filter((s) => s.id !== sessionId),
        })),

      flashcards: [],
      setFlashcards: (cards) => set({ flashcards: cards }),
      addFlashcard: (card) =>
        set((state) => ({ flashcards: [card, ...state.flashcards] })),
      updateFlashcard: (cardId, updates) =>
        set((state) => ({
          flashcards: state.flashcards.map((c) =>
            c.id === cardId ? { ...c, ...updates } : c,
          ),
        })),
      deleteFlashcard: (cardId) =>
        set((state) => ({
          flashcards: state.flashcards.filter((c) => c.id !== cardId),
        })),

      selectedChatSessionId: null,
      setSelectedChatSessionId: (id) => set({ selectedChatSessionId: id }),

      settings: {
        nativeLanguage: 'en',
        targetLanguage: 'en',
        soundEnabled: true,
        theme: 'system',
      },
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
    }),
    {
      name: 'english-app-store',
      storage: isServer ? serverStorage as any : safeLocalStorage as any,
      partialize: (state) => ({
        settings: state.settings,
        selectedChatSessionId: state.selectedChatSessionId,
      }),
      skipHydration: isServer,
    },
  ),
);

const EMPTY_SESSIONS: ChatSession[] = [];
export const useChatSessionsList = () =>
  useAppStore((state) => Array.isArray(state.chatSessions) ? state.chatSessions : EMPTY_SESSIONS);

export const useSelectedSessionId = () =>
  useAppStore((state) => state.selectedChatSessionId);

export const useChatSessionsActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSessions: state.setChatSessions,
      addSession: state.addChatSession,
      updateSession: state.updateChatSession,
      deleteSession: state.deleteChatSession,
      setSelectedSessionId: state.setSelectedChatSessionId,
    })),
  );

export const useFlashcardsList = () =>
  useAppStore((state) => state.flashcards);

export const useFlashcardsActions = () =>
  useAppStore(
    useShallow((state) => ({
      setCards: state.setFlashcards,
      addCard: state.addFlashcard,
      updateCard: state.updateFlashcard,
      deleteCard: state.deleteFlashcard,
    })),
  );

export const useSettings = () => useAppStore((state) => state.settings);
export const useSettingsActions = () =>
  useAppStore((state) => state.updateSettings);

export const useChatSessions = () => {
  const sessions = useChatSessionsList();
  const selectedSessionId = useSelectedSessionId();
  const actions = useChatSessionsActions();
  return { sessions, selectedSessionId, ...actions };
};

export const useHydratedStore = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isServer) {
      setHydrated(true);
    }
  }, []);

  return hydrated;
};
