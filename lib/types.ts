export type UserStats = {
  xp: number;
  currentHP: number;
  diveDepth: number;
  maxDiveDepth: number;
  streak: number;
  name: string | null;
  lastActiveAt?: string | null;
  grammarWeaknesses: Record<string, number> | null;
  unlockedNodes?: string[];
  topWeaknesses?: Array<{ rule: string; count: number }>;
  topStrengths?: Array<{ rule: string; count: number }>;
  avgVocabulary?: number;
  avgComplexity?: number;
  avgFluency?: number;
};

export type ChatSession = {
  id: string;
  persona: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    voiceId?: string | null;
  };
  messages: {
    id: string;
    text: string;
    sender: string;
    senderType: string;
    grammarCorrection: string | null;
    weaknessIdentified: string | null;
    bonusXP: boolean;
    createdAt: Date;
  }[];
  blockedBy?: string | null;
  blockedAt?: Date | string | null;
  lastBlocked?: string | null;
  unreadCount?: number;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  englishExplanation?: string | null;
  type: string;
  repetition: number;
  interval: number;
};

export type Settings = {
  nativeLanguage: string;
  targetLanguage: string;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
};
