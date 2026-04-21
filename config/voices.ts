export interface VoiceEntry {
  id: string;
  name: string;
  accent: 'us' | 'gb';
  gender: 'male' | 'female';
  vibe: string[];
}

export const VOICE_ROSTER: VoiceEntry[] = [
  // ── US Male ──────────────────────────────────────────────────────────────
  { id: 'en-US-DavisNeural',       name: 'Davis',       accent: 'us', gender: 'male',   vibe: ['deep', 'professional', 'authoritative'] },
  { id: 'en-US-GuyNeural',         name: 'Guy',         accent: 'us', gender: 'male',   vibe: ['friendly', 'warm', 'casual'] },
  { id: 'en-US-JasonNeural',       name: 'Jason',       accent: 'us', gender: 'male',   vibe: ['energetic', 'confident', 'dynamic'] },
  { id: 'en-US-TonyNeural',        name: 'Tony',        accent: 'us', gender: 'male',   vibe: ['calm', 'steady', 'trustworthy'] },
  { id: 'en-US-AndrewNeural',      name: 'Andrew',      accent: 'us', gender: 'male',   vibe: ['professional', 'clear', 'crisp'] },
  { id: 'en-US-BrianNeural',       name: 'Brian',       accent: 'us', gender: 'male',   vibe: ['friendly', 'approachable', 'conversational'] },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', accent: 'us', gender: 'male',   vibe: ['serious', 'formal', 'measured'] },
  { id: 'en-US-EricNeural',        name: 'Eric',        accent: 'us', gender: 'male',   vibe: ['cheerful', 'upbeat', 'engaging'] },
  { id: 'en-US-JacobNeural',       name: 'Jacob',       accent: 'us', gender: 'male',   vibe: ['youthful', 'casual', 'relatable'] },
  { id: 'en-US-RogerNeural',       name: 'Roger',       accent: 'us', gender: 'male',   vibe: ['mature', 'wise', 'authoritative'] },

  // ── US Female ─────────────────────────────────────────────────────────────
  { id: 'en-US-AriaNeural',        name: 'Aria',        accent: 'us', gender: 'female', vibe: ['warm', 'empathetic', 'natural'] },
  { id: 'en-US-JennyNeural',       name: 'Jenny',       accent: 'us', gender: 'female', vibe: ['friendly', 'conversational', 'bright'] },
  { id: 'en-US-JaneNeural',        name: 'Jane',        accent: 'us', gender: 'female', vibe: ['calm', 'professional', 'composed'] },
  { id: 'en-US-AmberNeural',       name: 'Amber',       accent: 'us', gender: 'female', vibe: ['energetic', 'upbeat', 'enthusiastic'] },
  { id: 'en-US-AnaNeural',         name: 'Ana',         accent: 'us', gender: 'female', vibe: ['youthful', 'playful', 'cheerful'] },
  { id: 'en-US-AshleyNeural',      name: 'Ashley',      accent: 'us', gender: 'female', vibe: ['casual', 'relatable', 'warm'] },
  { id: 'en-US-CoraNeural',        name: 'Cora',        accent: 'us', gender: 'female', vibe: ['calm', 'clear', 'measured'] },
  { id: 'en-US-ElizabethNeural',   name: 'Elizabeth',   accent: 'us', gender: 'female', vibe: ['formal', 'authoritative', 'polished'] },
  { id: 'en-US-MichelleNeural',    name: 'Michelle',    accent: 'us', gender: 'female', vibe: ['friendly', 'trustworthy', 'steady'] },
  { id: 'en-US-MonicaNeural',      name: 'Monica',      accent: 'us', gender: 'female', vibe: ['serious', 'professional', 'sharp'] },

  // ── GB Male ───────────────────────────────────────────────────────────────
  { id: 'en-GB-RyanNeural',        name: 'Ryan',        accent: 'gb', gender: 'male',   vibe: ['professional', 'clear', 'refined'] },
  { id: 'en-GB-OliverNeural',      name: 'Oliver',      accent: 'gb', gender: 'male',   vibe: ['friendly', 'warm', 'articulate'] },
  { id: 'en-GB-ThomasNeural',      name: 'Thomas',      accent: 'gb', gender: 'male',   vibe: ['formal', 'authoritative', 'steady'] },
  { id: 'en-GB-ArthurNeural',      name: 'Arthur',      accent: 'gb', gender: 'male',   vibe: ['mature', 'wise', 'distinguished'] },
  { id: 'en-GB-ElliotNeural',      name: 'Elliot',      accent: 'gb', gender: 'male',   vibe: ['casual', 'youthful', 'energetic'] },
  { id: 'en-GB-EthanNeural',       name: 'Ethan',       accent: 'gb', gender: 'male',   vibe: ['calm', 'thoughtful', 'gentle'] },
  { id: 'en-GB-NoahNeural',        name: 'Noah',        accent: 'gb', gender: 'male',   vibe: ['friendly', 'approachable', 'natural'] },
  { id: 'en-GB-OscarNeural',       name: 'Oscar',       accent: 'gb', gender: 'male',   vibe: ['deep', 'serious', 'measured'] },
  { id: 'en-GB-AlfieNeural',       name: 'Alfie',       accent: 'gb', gender: 'male',   vibe: ['cheerful', 'playful', 'bright'] },
  { id: 'en-GB-WilliamNeural',     name: 'William',     accent: 'gb', gender: 'male',   vibe: ['strict', 'authoritative', 'commanding'] },

  // ── GB Female ─────────────────────────────────────────────────────────────
  { id: 'en-GB-SoniaNeural',       name: 'Sonia',       accent: 'gb', gender: 'female', vibe: ['professional', 'polished', 'clear'] },
  { id: 'en-GB-LibbyNeural',       name: 'Libby',       accent: 'gb', gender: 'female', vibe: ['friendly', 'warm', 'natural'] },
  { id: 'en-GB-AbbiNeural',        name: 'Abbi',        accent: 'gb', gender: 'female', vibe: ['casual', 'energetic', 'youthful'] },
  { id: 'en-GB-BellaNeural',       name: 'Bella',       accent: 'gb', gender: 'female', vibe: ['calm', 'empathetic', 'gentle'] },
  { id: 'en-GB-HollieNeural',      name: 'Hollie',      accent: 'gb', gender: 'female', vibe: ['cheerful', 'upbeat', 'bright'] },
  { id: 'en-GB-MaisieNeural',      name: 'Maisie',      accent: 'gb', gender: 'female', vibe: ['playful', 'youthful', 'expressive'] },
  { id: 'en-GB-OliviaNeural',      name: 'Olivia',      accent: 'gb', gender: 'female', vibe: ['refined', 'articulate', 'composed'] },
  { id: 'en-GB-MiaNeural',         name: 'Mia',         accent: 'gb', gender: 'female', vibe: ['warm', 'conversational', 'approachable'] },
  { id: 'en-GB-HarperNeural',      name: 'Harper',      accent: 'gb', gender: 'female', vibe: ['serious', 'formal', 'authoritative'] },
  { id: 'en-GB-AmeliaNeural',      name: 'Amelia',      accent: 'gb', gender: 'female', vibe: ['strict', 'professional', 'commanding'] },
];

export function getVoicesByAccent(accent: 'us' | 'gb'): VoiceEntry[] {
  return VOICE_ROSTER.filter((v) => v.accent === accent);
}

export function getVoiceById(id: string): VoiceEntry | undefined {
  return VOICE_ROSTER.find((v) => v.id === id);
}
