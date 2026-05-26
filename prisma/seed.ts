require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { FEATURED_PRESETS } = require('../config/featured-personas');

const { Pool } = require('pg');

const connectionString = process.env.DIRECT_DB_URL || process.env.DATABASE_URL || 'postgresql://postgres:password@helium/heliumdb?sslmode=disable';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Initializing Neural Core Seeding ---');

  // Seed featured personas from config
  for (const preset of FEATURED_PRESETS) {
    const personaId = `featured-${preset.name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.persona.upsert({
      where: { id: personaId },
      update: {
        name: preset.name,
        description: preset.description,
        systemPrompt: preset.systemPrompt,
        avatarUrl: preset.image || null,
        voiceId: preset.voiceId,
        category: preset.category,
        isPublic: true,
      },
      create: {
        id: personaId,
        name: preset.name,
        description: preset.description,
        systemPrompt: preset.systemPrompt,
        avatarUrl: preset.image || null,
        voiceId: preset.voiceId,
        category: preset.category,
        isPublic: true,
        creatorId: null, // System personas
      },
    });
  }

  const personas = [
    {
      name: 'The Toxic Zoomer',
      description: 'Aggressive, brain-rot slang, zero patience for boomer grammar.',
      systemPrompt: 'You are a 19-year-old TikTok influencer who is physically pained by bad English. You use "no cap", "fr", and "bruh" constantly. You are helping the user with their English but you are extremely judgmental about it.',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    },
    {
      name: 'Strict HR Director',
      description: 'Corporate, passive-aggressive, obsessed with professionalism.',
      systemPrompt: 'You are an HR Director at a Fortune 500 company. Every grammar mistake the user makes is a potential reason for termination. You are "circling back" and "touching base" while being absolutely brutal about their preposition usage.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    },
    {
      name: 'Victorian Professor',
      description: 'Formal, archaic, highly sophisticated and deeply disappointed.',
      systemPrompt: 'You are a Professor from 1890s Oxford. You find modern speech abhorrent. You correct the user with extreme verbosity and flowery insults. You insist on perfect subjunctive mood usage.',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    },
    {
      name: 'Chill Californian',
      description: 'Laid-back surfer vibes, speaks in idioms and casual American English.',
      systemPrompt: 'You are a laid-back surfer from Santa Cruz, California. You use idioms like "hang loose", "stoked", and "for sure" constantly. You help the user with casual American English conversation while staying totally chill about it.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    },
  ];

  for (const p of personas) {
    await prisma.persona.upsert({
      where: { id: `template-${p.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: p,
      create: {
        id: `template-${p.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...p,
      },
    });
  }

  const skills = [
    { slug: 'past-simple', title: 'Past Simple', description: 'Basic past tense. "I went to the store."', category: 'Temporal Shifts', level: 1, xpReward: 50 },
    { slug: 'present-perfect', title: 'Present Perfect', description: 'Recent past with present relevance. "I have been there."', category: 'Temporal Shifts', level: 2, xpReward: 100 },
    { slug: 'past-perfect', title: 'Past Perfect', description: 'Past before past. "I had left before she arrived."', category: 'Temporal Shifts', level: 3, xpReward: 150 },
    { slug: 'future-perfect', title: 'Future Perfect', description: 'Completion in the future. "I will have finished by then."', category: 'Temporal Shifts', level: 4, xpReward: 200 },
    { slug: 'future-perfect-continuous', title: 'Future Perfect Continuous', description: 'Ongoing action completed in future.', category: 'Temporal Shifts', level: 5, xpReward: 250 },
    { slug: 'passive-voice', title: 'Passive Voice', description: 'Action-focused sentences. "The letter was written by her."', category: 'Manipulation & Politeness', level: 2, xpReward: 120 },
    { slug: 'causative-verbs', title: 'Causative Verbs', description: 'Have/Get someone do something. "I had my car fixed."', category: 'Manipulation & Politeness', level: 3, xpReward: 140 },
    { slug: 'modals-politeness', title: 'Modals & Politeness', description: 'Subtle requests. "Would you mind if...?"', category: 'Manipulation & Politeness', level: 4, xpReward: 180 },
    { slug: 'conditional-mastery', title: 'Conditional Mastery', description: 'Complex if-clauses. "If I had known, I would have..."', category: 'Manipulation & Politeness', level: 5, xpReward: 220 },
    { slug: 'reported-speech', title: 'Reported Speech', description: 'Quoting others indirectly. "He said he would come."', category: 'Advanced Topics', level: 3, xpReward: 160 },
    { slug: 'inversion', title: 'Inversion Patterns', description: 'Advanced word order. "Never have I seen such..."', category: 'Advanced Topics', level: 4, xpReward: 190 },
    { slug: 'gerunds-infinitives', title: 'Gerunds & Infinitives', description: 'Verb forms mastery. "I enjoy skiing vs I like to ski."', category: 'Advanced Topics', level: 3, xpReward: 130 },
  ];

  for (const s of skills) {
    await prisma.skillNode.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  console.log('--- Neural Core Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
