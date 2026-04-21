// Aura Level System — based on Dive Depth (0–200m)
// XP removed: depth IS the single progression metric.

import {
  INITIAL_HP,
  HP_PER_LEVEL,
  BASE_REGEN,
  REGEN_LEVEL_INTERVAL,
} from '@/src/config/gameplayConfig';

export interface LevelInfo {
  level: number;
  rank: string;
  emoji: string;
  minDepth: number;
  nextDepth: number;
  depthInLevel: number;
  progress: number;
  isMax: boolean;
  color: string;
  description: string;
}

// [level, rank, emoji, minDepth, color, description]
const LEVEL_TABLE: [number, string, string, number, string, string][] = [
  [1,  'Beginner',         '🌱', 0,   '#94a3b8', 'Just getting started'],
  [2,  'Curious',          '🔍', 5,   '#60a5fa', 'Starting to explore English'],
  [3,  'Speaker',          '🗣️', 15,  '#34d399', 'Can hold a basic conversation'],
  [4,  'Conversationalist','💬', 30,  '#4ade80', 'Comfortable in everyday chat'],
  [5,  'Communicator',     '✉️', 50,  '#a3e635', 'Clear and confident communication'],
  [6,  'Linguist',         '📖', 70,  '#facc15', 'Deep understanding of the language'],
  [7,  'Fluent',           '🌊', 90,  '#fb923c', 'Natural, effortless expression'],
  [8,  'Proficient',       '⚡', 110, '#f97316', 'Near-native fluency'],
  [9,  'Advanced',         '🎯', 130, '#ef4444', 'Complex grammar mastered'],
  [10, 'Expert',           '💎', 150, '#e040fb', 'Exceptional command of English'],
  [11, 'Scholar',          '🏛️', 170, '#c084fc', 'Academic-level proficiency'],
  [12, 'Master',           '👑', 200, '#00d4d4', 'Elite English mastery'],
];

const MAX_LEVEL = LEVEL_TABLE.length;

export function getLevelInfo(depth: number): LevelInfo {
  let current = LEVEL_TABLE[0];
  let next = LEVEL_TABLE[1];

  for (let i = LEVEL_TABLE.length - 1; i >= 0; i--) {
    if (depth >= LEVEL_TABLE[i][3]) {
      current = LEVEL_TABLE[i];
      next = LEVEL_TABLE[i + 1] || null!;
      break;
    }
  }

  const [level, rank, emoji, minDepth, color, description] = current;
  const isMax = level === MAX_LEVEL;

  if (isMax) {
    return {
      level, rank, emoji, minDepth,
      nextDepth: 200,
      depthInLevel: depth - minDepth,
      progress: 100,
      isMax: true,
      color,
      description,
    };
  }

  const nextDepth = next[3];
  const depthInLevel = depth - minDepth;
  const depthNeededForNext = nextDepth - minDepth;
  const progress = Math.min(100, Math.max(0, Math.round((depthInLevel / depthNeededForNext) * 100)));

  return {
    level, rank, emoji, minDepth,
    nextDepth,
    depthInLevel,
    progress,
    isMax: false,
    color,
    description,
  };
}

export function getDepthToNextLevel(depth: number): number {
  const info = getLevelInfo(depth);
  if (info.isMax) return 0;
  return info.nextDepth - depth;
}

export function getLevelTable() {
  return LEVEL_TABLE.map(([level, rank, emoji, minDepth, color, description]) => ({
    level, rank, emoji, minDepth, color, description,
  }));
}

export function getMaxHP(depth: number): number {
  const { level } = getLevelInfo(depth);
  return INITIAL_HP + (level - 1) * HP_PER_LEVEL;
}

export function getHPRegen(depth: number): number {
  const { level } = getLevelInfo(depth);
  return BASE_REGEN + Math.floor((level - 1) / REGEN_LEVEL_INTERVAL);
}
