import { ReelMessage, ReelType, GenerationStage } from '@/hooks/useReelGenerator';

export type Platform = 'tiktok' | 'reels' | 'shorts' | 'twitter';
export type Step = 'picker' | 'preview' | 'generating' | 'share';

export interface ReelTypeDef {
  id: ReelType;
  emoji: string;
  name: string;
  hook: string;
  description: string;
  minMessages?: number;
  minSessions?: number;
}

export const REEL_TYPES: ReelTypeDef[] = [
  {
    id: 'ROAST',
    emoji: '💀',
    name: 'The Roast',
    hook: 'The AI caught my exact speech pattern',
    description: 'A genuine look at where you trip up in English.',
    minMessages: 3,
  },
  {
    id: 'FLEX',
    emoji: '⚡',
    name: 'The Milestone',
    hook: 'Tracking actual fluency progress',
    description: 'Your session stats and depth reached.',
  },
  {
    id: 'CONFESSION',
    emoji: '😬',
    name: 'The Reality Check',
    hook: 'Self-assessment vs. reality',
    description: 'Highlighting the gap between perceived and actual level.',
  },
  {
    id: 'MIRROR',
    emoji: '🪞',
    name: 'The Mirror',
    hook: 'How I actually sound unscripted',
    description: 'Your organic speech patterns labeled clearly.',
  },
  {
    id: 'CHALLENGE',
    emoji: '🏆',
    name: 'The Benchmark',
    hook: 'Deep dive focus session completed',
    description: 'Your conversational endurance score.',
  },
  {
    id: 'PROPHECY',
    emoji: '🔮',
    name: 'The Analysis',
    hook: 'AI mapped my conversational habits',
    description: 'Behavioral analysis of your English fluency.',
    minSessions: 3,
  },
];

export const PLATFORM_CAPTIONS: Record<ReelType, Record<Platform, string>> = {
  ROAST: {
    tiktok: 'My AI English tutor taking zero prisoners today. 💀\n"[worst_sentence]"\n#LanguageLearning #EnglishPractice',
    reels: 'The AI caught my exact speaking habit when I\'m nervous 💀\n"[worst_sentence]"\n#EnglishFluency',
    shorts: 'Having an AI analyze my raw English speaking habits. This is painfully accurate.\n#LearnEnglish',
    twitter: 'Got an AI to review my English fluency and it immediately found my worst crutch:\n"[worst_sentence]" 💀',
  },
  FLEX: {
    tiktok: 'Reached [depth]m conversational depth in my English practice today ⚡\n#LanguageLearning',
    reels: 'Tracking my actual English progress over [timeframe] ⚡\nDepth: [depth]m\n#EnglishPractice',
    shorts: 'English immersion session complete. Depth achieved: [depth]m.\n#Fluency',
    twitter: 'Practicing unscripted English. Hit [depth]m depth today.\n#LanguageLearning',
  },
  CONFESSION: {
    tiktok: 'The difference between my self-assessed English and my actual conversational level 😬\n#LearnEnglish',
    reels: 'I thought my English was [actual_level], but unscripted conversations humble you fast 😬\n#LanguageLearning',
    shorts: 'What happens when you test your "fluent" English against a native-level AI 😬\n#English',
    twitter: 'My self-assessment: intermediate.\nMy actual conversational reality: 😬',
  },
  MIRROR: {
    tiktok: 'How I actually sound speaking unscripted English 🪞\n#EnglishFluency',
    reels: 'Recording my raw, unscripted English to find actual speaking patterns 🪞\n#LearnEnglish',
    shorts: 'No filters, just my actual English speaking habits being analyzed in real-time 🪞',
    twitter: 'Got an AI to map out my conversational English patterns. Really interesting to see it visualized.',
  },
  CHALLENGE: {
    tiktok: 'Just completed a [depth]m deep focus session entirely in English 🏆\n#LanguageLearning',
    reels: 'My conversational endurance score after a long English session 🏆\n#Fluency',
    shorts: 'Deep focus English practice: [depth]m 🏆\n#LearnEnglish',
    twitter: 'Finished a high-intensity English speaking session. Depth: [depth]m 🏆',
  },
  PROPHECY: {
    tiktok: 'An AI mapped my exact English speaking habits 🔮\n"[prediction_1]"\n"[prediction_2]"\n#EnglishPractice',
    reels: 'The behavioral analysis of how I actually speak English is wildly accurate 🔮\n#LearnEnglish',
    shorts: 'AI analyzing my conversational English habits in real-time 🔮\n#Fluency',
    twitter: 'The AI analyzed my English patterns and predicted:\n"[prediction_1]" 🔮\nActually spots my exact habits.',
  },
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  reels: 'Reels',
  shorts: 'YT Shorts',
  twitter: 'X / Twitter',
};

export const STAGE_LABELS: Record<GenerationStage, string> = {
  idle: 'Waiting...',
  analyzing: 'Analyzing session...',
  composing: 'Composing reel...',
  audio: 'Layering audio...',
  encoding: 'Encoding...',
  ready: 'Ready to drop ▼',
};
