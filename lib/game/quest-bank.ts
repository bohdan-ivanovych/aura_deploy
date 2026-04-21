export type QuestCategory = 'vocab' | 'grammar' | 'fluency' | 'consistency' | 'engagement';

export interface QuestSeed {
  title: string;
  description: string;
  xp: number;
  category: QuestCategory;
}

export const QUEST_BANK: QuestSeed[] = [
  { title: 'Vocab Flex', description: 'Write a message scored 70+ on vocabulary', xp: 35, category: 'vocab' },
  { title: 'Word Explorer', description: 'Use 3 new words in this session', xp: 30, category: 'vocab' },
  { title: 'Synonym Swap', description: 'Use a strong synonym instead of a common word', xp: 25, category: 'vocab' },
  { title: 'Idiom Drop', description: 'Use an English idiom naturally', xp: 40, category: 'vocab' },
  { title: 'Academic Voice', description: 'Score 80+ on vocabulary in a single message', xp: 50, category: 'vocab' },
  { title: 'Lexicon Master', description: 'Use 5 words over B2 level', xp: 60, category: 'vocab' },
  { title: 'Adjective Artist', description: 'Use 3 descriptive adjectives in one sentence', xp: 35, category: 'vocab' },
  { title: 'Verb Virtuoso', description: 'Use 3 strong action verbs in one message', xp: 35, category: 'vocab' },
  { title: 'Slang Surfer', description: 'Use a natural slang expression appropriately', xp: 40, category: 'vocab' },
  { title: 'Collocation King', description: 'Use 2 common natural collocations', xp: 45, category: 'vocab' },

  { title: 'Flawless 5', description: 'Send 5 messages in a row without any grammar errors', xp: 50, category: 'grammar' },
  { title: 'Article Ace', description: 'Send 3 messages in a row with no article errors', xp: 25, category: 'grammar' },
  { title: 'Past Perfect Pro', description: 'Use the Past Perfect tense correctly', xp: 40, category: 'grammar' },
  { title: 'Conditional Master', description: 'Use a conditional sentence flawlessly', xp: 40, category: 'grammar' },
  { title: 'Tense Juggler', description: 'Use 3 different tenses correctly in one message', xp: 45, category: 'grammar' },
  { title: 'Preposition Perfect', description: 'Send 4 messages with no preposition errors', xp: 35, category: 'grammar' },
  { title: 'Passive Power', description: 'Use passive voice correctly', xp: 30, category: 'grammar' },
  { title: 'Plural Perfection', description: 'Make zero singular/plural mistakes today', xp: 40, category: 'grammar' },
  { title: 'Modal Master', description: 'Use might, could, or should contextually', xp: 35, category: 'grammar' },
  { title: 'Gerund Guru', description: 'Use a gerund phrase subject correctly', xp: 45, category: 'grammar' },

  { title: 'Complex Thinker', description: 'Write a message with a subordinate clause', xp: 30, category: 'fluency' },
  { title: 'Smooth Talker', description: 'Score 70+ on fluency in a single message', xp: 35, category: 'fluency' },
  { title: 'Natural Flow', description: 'Send 3 messages in a row with fluency score > 60', xp: 40, category: 'fluency' },
  { title: 'Long Form', description: 'Write a message with more than 20 words with no errors', xp: 35, category: 'fluency' },
  { title: 'Eloquence', description: 'Score 80+ on both fluency AND complexity', xp: 50, category: 'fluency' },
  { title: 'Connective Tissue', description: 'Use transition words effortlessly', xp: 40, category: 'fluency' },
  { title: 'Paragraph Pro', description: 'Write a full 3-sentence paragraph naturally', xp: 45, category: 'fluency' },
  { title: 'Quick Thinker', description: 'Reply in under 10 seconds 3 times', xp: 30, category: 'fluency' },
  { title: 'Native Rhythm', description: 'Maintain 75+ fluency for 5 messages', xp: 60, category: 'fluency' },
  { title: 'Elaborator', description: 'Add context using relative clauses', xp: 40, category: 'fluency' },

  { title: 'Depth Diver', description: 'Send 10 messages in a single session today', xp: 30, category: 'consistency' },
  { title: 'Warm Up', description: 'Send your first 3 messages of the day', xp: 15, category: 'consistency' },
  { title: 'Marathon', description: 'Send 15 messages in one day', xp: 45, category: 'consistency' },
  { title: 'Error Crusher', description: 'Fix a grammar mistake pointed out by AI', xp: 35, category: 'consistency' },
  { title: 'Streak Builder', description: 'Maintain your streak for another day', xp: 20, category: 'consistency' },
  { title: 'Night Owl', description: 'Practice during evening hours', xp: 25, category: 'consistency' },
  { title: 'Early Bird', description: 'Practice in the morning', xp: 25, category: 'consistency' },
  { title: 'Reviewer', description: 'Complete your previous daily quests', xp: 40, category: 'consistency' },
  { title: 'Steady Pace', description: 'Keep a 3-day active streak alive', xp: 35, category: 'consistency' },
  { title: 'Relentless', description: 'Hit your daily goal twice in volume', xp: 60, category: 'consistency' },

  { title: 'Question Time', description: 'Ask the AI a complex question', xp: 25, category: 'engagement' },
  { title: 'Opinion Piece', description: 'Express an opinion and back it up', xp: 30, category: 'engagement' },
  { title: 'Story Starter', description: 'Tell a short story (3+ sentences)', xp: 35, category: 'engagement' },
  { title: 'Debate Club', description: 'Politely disagree with the AI', xp: 30, category: 'engagement' },
  { title: 'Deep Discussion', description: 'Have 8+ back-and-forth exchanges on one topic', xp: 40, category: 'engagement' },
  { title: 'Emotion Express', description: 'Describe how you feel using strong vocab', xp: 35, category: 'engagement' },
  { title: 'World Builder', description: 'Describe a fictional scenario', xp: 45, category: 'engagement' },
  { title: 'Curious Mind', description: 'Ask follow up questions 3 times', xp: 40, category: 'engagement' },
  { title: 'The Critic', description: 'Review a movie, book, or concept', xp: 35, category: 'engagement' },
  { title: 'Humor Test', description: 'Try to make a joke or use sarcasm naturally', xp: 50, category: 'engagement' },
];