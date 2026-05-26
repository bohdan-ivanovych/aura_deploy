export type GrammarNodeSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: number;
  xpReward: number;
  prerequisiteSlugs: string[];
  keywords: string[];
};

export const GRAMMAR_NODES: GrammarNodeSeed[] = [
  // ── VERB TENSES ──────────────────────────────────────────────────────────
  {
    slug: 'present-simple',
    title: 'Present Simple',
    description: 'Habits & facts. "She reads every day."',
    category: 'Verb Tenses',
    level: 1,
    xpReward: 30,
    prerequisiteSlugs: [],
    keywords: ['present simple', 'simple present', 'third person s', 'present tense'],
  },
  {
    slug: 'present-continuous',
    title: 'Present Continuous',
    description: 'Actions happening now. "She is reading right now."',
    category: 'Verb Tenses',
    level: 2,
    xpReward: 40,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['present continuous', 'present progressive', 'ing form', 'be + ing'],
  },
  {
    slug: 'past-simple',
    title: 'Past Simple',
    description: 'Completed actions. "She read the book yesterday."',
    category: 'Verb Tenses',
    level: 2,
    xpReward: 40,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['past simple', 'simple past', 'irregular past', 'regular past', 'past tense', 'ed ending'],
  },
  {
    slug: 'past-continuous',
    title: 'Past Continuous',
    description: 'Ongoing past action. "She was reading when I called."',
    category: 'Verb Tenses',
    level: 3,
    xpReward: 60,
    prerequisiteSlugs: ['past-simple', 'present-continuous'],
    keywords: ['past continuous', 'past progressive', 'was doing', 'were doing'],
  },
  {
    slug: 'present-perfect',
    title: 'Present Perfect',
    description: 'Past with present relevance. "I have been there."',
    category: 'Verb Tenses',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['past-simple'],
    keywords: ['present perfect', 'have done', 'has done', 'just done', 'ever never yet already'],
  },
  {
    slug: 'present-perfect-continuous',
    title: 'Present Perfect Continuous',
    description: 'Ongoing action since past. "I have been reading for an hour."',
    category: 'Verb Tenses',
    level: 4,
    xpReward: 90,
    prerequisiteSlugs: ['present-perfect', 'past-continuous'],
    keywords: ['present perfect continuous', 'have been doing', 'has been doing'],
  },
  {
    slug: 'past-perfect',
    title: 'Past Perfect',
    description: 'Past before past. "She had left before he arrived."',
    category: 'Verb Tenses',
    level: 4,
    xpReward: 90,
    prerequisiteSlugs: ['present-perfect'],
    keywords: ['past perfect', 'had done', 'pluperfect', 'past before past'],
  },
  {
    slug: 'past-perfect-continuous',
    title: 'Past Perfect Continuous',
    description: 'Duration before a past point. "She had been studying for 3 hours."',
    category: 'Verb Tenses',
    level: 5,
    xpReward: 110,
    prerequisiteSlugs: ['past-perfect', 'present-perfect-continuous'],
    keywords: ['past perfect continuous', 'had been doing'],
  },
  {
    slug: 'future-will',
    title: 'Future with Will',
    description: 'Decisions & predictions. "I will call you later."',
    category: 'Verb Tenses',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['will future', 'future simple', 'will do', 'prediction', 'spontaneous decision'],
  },
  {
    slug: 'future-going-to',
    title: 'Future with Going To',
    description: 'Plans & intentions. "She is going to study abroad."',
    category: 'Verb Tenses',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['present-continuous'],
    keywords: ['going to', 'future plan', 'intended action', 'near future'],
  },
  {
    slug: 'future-continuous',
    title: 'Future Continuous',
    description: 'Actions in progress in future. "I will be working at 5pm."',
    category: 'Verb Tenses',
    level: 4,
    xpReward: 90,
    prerequisiteSlugs: ['future-will', 'past-continuous'],
    keywords: ['future continuous', 'will be doing', 'future progressive'],
  },
  {
    slug: 'future-perfect',
    title: 'Future Perfect',
    description: 'Completion before a future point. "I will have finished by Friday."',
    category: 'Verb Tenses',
    level: 5,
    xpReward: 120,
    prerequisiteSlugs: ['future-continuous', 'past-perfect'],
    keywords: ['future perfect', 'will have done', 'by the time'],
  },

  // ── MODAL VERBS ──────────────────────────────────────────────────────────
  {
    slug: 'modals-can-could',
    title: 'Can & Could',
    description: 'Ability & permission. "I can swim. Could you help me?"',
    category: 'Modal Verbs',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['can', 'could', 'ability', 'permission', 'polite request'],
  },
  {
    slug: 'modals-may-might',
    title: 'May & Might',
    description: 'Possibility & permission. "It may rain. She might come."',
    category: 'Modal Verbs',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['modals-can-could'],
    keywords: ['may', 'might', 'possibility', 'probability'],
  },
  {
    slug: 'modals-must-have-to',
    title: 'Must & Have To',
    description: 'Obligation & necessity. "You must stop. I have to go."',
    category: 'Modal Verbs',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['modals-can-could'],
    keywords: ['must', 'have to', 'obligation', 'necessity', 'prohibition', 'mustn\'t'],
  },
  {
    slug: 'modals-should-ought',
    title: 'Should & Ought To',
    description: 'Advice & expectation. "You should rest. We ought to go."',
    category: 'Modal Verbs',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['modals-can-could'],
    keywords: ['should', 'ought to', 'advice', 'recommendation', 'expectation'],
  },
  {
    slug: 'modals-would-used-to',
    title: 'Would & Used To',
    description: 'Past habits & hypothetical. "I used to play piano."',
    category: 'Modal Verbs',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['modals-should-ought', 'past-simple'],
    keywords: ['would', 'used to', 'past habit', 'past routine'],
  },
  {
    slug: 'modal-perfects',
    title: 'Modal Perfects',
    description: 'Past deduction & criticism. "She must have left. You should have called."',
    category: 'Modal Verbs',
    level: 4,
    xpReward: 100,
    prerequisiteSlugs: ['modals-would-used-to', 'past-perfect'],
    keywords: ['must have', 'should have', 'could have', 'might have', 'modal perfect'],
  },

  // ── CONDITIONALS ─────────────────────────────────────────────────────────
  {
    slug: 'conditional-zero',
    title: 'Zero Conditional',
    description: 'Universal truths. "If water freezes, it turns to ice."',
    category: 'Conditionals',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['zero conditional', 'general truth', 'scientific fact'],
  },
  {
    slug: 'conditional-first',
    title: 'First Conditional',
    description: 'Real future possibility. "If it rains, I will stay home."',
    category: 'Conditionals',
    level: 2,
    xpReward: 60,
    prerequisiteSlugs: ['future-will'],
    keywords: ['first conditional', 'real conditional', 'if will', 'future possibility'],
  },
  {
    slug: 'conditional-second',
    title: 'Second Conditional',
    description: 'Hypothetical present/future. "If I had money, I would travel."',
    category: 'Conditionals',
    level: 3,
    xpReward: 80,
    prerequisiteSlugs: ['conditional-first', 'modals-would-used-to'],
    keywords: ['second conditional', 'unreal conditional', 'hypothetical', 'if I had', 'would'],
  },
  {
    slug: 'conditional-third',
    title: 'Third Conditional',
    description: 'Unreal past. "If I had known, I would have gone."',
    category: 'Conditionals',
    level: 4,
    xpReward: 100,
    prerequisiteSlugs: ['conditional-second', 'past-perfect'],
    keywords: ['third conditional', 'past unreal', 'if I had known', 'would have'],
  },
  {
    slug: 'conditional-mixed',
    title: 'Mixed Conditionals',
    description: 'Combined time frames. "If I had studied, I would be a doctor now."',
    category: 'Conditionals',
    level: 5,
    xpReward: 130,
    prerequisiteSlugs: ['conditional-third'],
    keywords: ['mixed conditional', 'mixed tenses', 'past condition present result'],
  },

  // ── PASSIVE VOICE ────────────────────────────────────────────────────────
  {
    slug: 'passive-basic',
    title: 'Passive Voice (Basic)',
    description: 'Action focus. "The book was written by her."',
    category: 'Passive & Causative',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['past-simple', 'present-perfect'],
    keywords: ['passive voice', 'passive', 'be done', 'was made', 'is called'],
  },
  {
    slug: 'passive-advanced',
    title: 'Passive Voice (Advanced)',
    description: 'Complex passives. "It is believed that... / She is said to be..."',
    category: 'Passive & Causative',
    level: 4,
    xpReward: 100,
    prerequisiteSlugs: ['passive-basic', 'modal-perfects'],
    keywords: ['advanced passive', 'it is believed', 'it is said', 'reported passive'],
  },
  {
    slug: 'causative-have-get',
    title: 'Causative (Have/Get)',
    description: 'Arranging for others. "I had my hair cut. She got her car fixed."',
    category: 'Passive & Causative',
    level: 4,
    xpReward: 90,
    prerequisiteSlugs: ['passive-basic'],
    keywords: ['causative', 'have something done', 'get something done', 'causative passive'],
  },

  // ── REPORTED SPEECH ───────────────────────────────────────────────────────
  {
    slug: 'reported-statements',
    title: 'Reported Statements',
    description: 'Indirect quotes. "He said he was tired."',
    category: 'Reported Speech',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['past-simple', 'past-perfect'],
    keywords: ['reported speech', 'indirect speech', 'said that', 'told me', 'backshift'],
  },
  {
    slug: 'reported-questions',
    title: 'Reported Questions',
    description: 'Indirect questions. "She asked where I lived."',
    category: 'Reported Speech',
    level: 3,
    xpReward: 80,
    prerequisiteSlugs: ['reported-statements'],
    keywords: ['reported questions', 'indirect questions', 'asked me if', 'asked where'],
  },
  {
    slug: 'reported-commands',
    title: 'Reported Commands',
    description: 'Indirect orders. "He told me to sit down."',
    category: 'Reported Speech',
    level: 4,
    xpReward: 80,
    prerequisiteSlugs: ['reported-questions'],
    keywords: ['reported commands', 'told me to', 'asked me to', 'indirect commands'],
  },

  // ── RELATIVE CLAUSES ─────────────────────────────────────────────────────
  {
    slug: 'relative-defining',
    title: 'Defining Relative Clauses',
    description: 'Essential info. "The man who called is my uncle."',
    category: 'Relative Clauses',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['relative clause', 'defining relative', 'who which that where', 'restrictive clause'],
  },
  {
    slug: 'relative-non-defining',
    title: 'Non-Defining Relative Clauses',
    description: 'Extra info with commas. "My brother, who lives in London, is a doctor."',
    category: 'Relative Clauses',
    level: 4,
    xpReward: 90,
    prerequisiteSlugs: ['relative-defining'],
    keywords: ['non-defining relative', 'which comma', 'extra information', 'non-restrictive'],
  },
  {
    slug: 'relative-reduced',
    title: 'Reduced Relative Clauses',
    description: 'Shortened clauses. "The boy playing outside is my son."',
    category: 'Relative Clauses',
    level: 5,
    xpReward: 110,
    prerequisiteSlugs: ['relative-non-defining', 'present-continuous'],
    keywords: ['reduced relative', 'participial phrase', 'ing clause', 'ed clause'],
  },

  // ── ARTICLES & QUANTIFIERS ───────────────────────────────────────────────
  {
    slug: 'articles-a-an-the',
    title: 'Articles: a / an / the',
    description: 'Indefinite & definite. "An apple a day. The sun rises in the east."',
    category: 'Articles & Determiners',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['article', 'a an the', 'indefinite article', 'definite article'],
  },
  {
    slug: 'articles-zero',
    title: 'Zero Article',
    description: 'When to omit articles. "I love music. She is at home."',
    category: 'Articles & Determiners',
    level: 2,
    xpReward: 60,
    prerequisiteSlugs: ['articles-a-an-the'],
    keywords: ['zero article', 'no article', 'uncountable nouns article', 'proper nouns'],
  },
  {
    slug: 'quantifiers',
    title: 'Quantifiers',
    description: 'Amounts & numbers. "much/many/few/little/a lot of/plenty of"',
    category: 'Articles & Determiners',
    level: 2,
    xpReward: 60,
    prerequisiteSlugs: ['articles-a-an-the'],
    keywords: ['quantifier', 'much many', 'few little', 'a lot of', 'some any', 'plenty of'],
  },

  // ── NOUNS & PRONOUNS ─────────────────────────────────────────────────────
  {
    slug: 'countable-uncountable',
    title: 'Countable & Uncountable Nouns',
    description: 'Type distinction. "water/a glass of water; information/a piece of info"',
    category: 'Nouns & Pronouns',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['countable', 'uncountable', 'count nouns', 'mass nouns'],
  },
  {
    slug: 'plural-nouns',
    title: 'Irregular Plurals',
    description: 'Exceptions. "child→children, mouse→mice, criterion→criteria"',
    category: 'Nouns & Pronouns',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['countable-uncountable'],
    keywords: ['plural', 'irregular plural', 'plurals', 'children mice men women'],
  },
  {
    slug: 'pronouns-personal',
    title: 'Personal & Possessive Pronouns',
    description: 'Subject/object/possessive. "I/me/my/mine, he/him/his"',
    category: 'Nouns & Pronouns',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['pronoun', 'personal pronoun', 'possessive pronoun', 'subject object'],
  },
  {
    slug: 'reflexive-pronouns',
    title: 'Reflexive Pronouns',
    description: 'Self-reference. "I did it myself. They enjoyed themselves."',
    category: 'Nouns & Pronouns',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['pronouns-personal'],
    keywords: ['reflexive pronoun', 'myself yourself himself herself themselves', 'emphatic pronoun'],
  },

  // ── ADJECTIVES & ADVERBS ─────────────────────────────────────────────────
  {
    slug: 'adjective-order',
    title: 'Adjective Order',
    description: 'Correct sequence. "a beautiful big red wooden box"',
    category: 'Adjectives & Adverbs',
    level: 2,
    xpReward: 60,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['adjective order', 'order of adjectives', 'opinion size age color'],
  },
  {
    slug: 'comparatives',
    title: 'Comparatives',
    description: 'Comparing two things. "bigger, more beautiful, less expensive"',
    category: 'Adjectives & Adverbs',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['adjective-order'],
    keywords: ['comparative', 'more than', '-er than', 'comparison', 'bigger better faster'],
  },
  {
    slug: 'superlatives',
    title: 'Superlatives',
    description: 'Highest degree. "the biggest, the most beautiful, the least expensive"',
    category: 'Adjectives & Adverbs',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['comparatives'],
    keywords: ['superlative', 'the most', 'the -est', 'best worst most least'],
  },
  {
    slug: 'adverbs-types',
    title: 'Adverb Types & Placement',
    description: 'Manner, frequency, degree. "She carefully opened the door."',
    category: 'Adjectives & Adverbs',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['adjective-order'],
    keywords: ['adverb', 'adverb placement', 'manner adverb', 'frequency adverb', 'degree adverb'],
  },

  // ── PREPOSITIONS ─────────────────────────────────────────────────────────
  {
    slug: 'prepositions-time',
    title: 'Prepositions of Time',
    description: 'When things happen. "at 5, on Monday, in July, since 2020, for 3 years"',
    category: 'Prepositions',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['preposition time', 'at on in time', 'since for during', 'by until'],
  },
  {
    slug: 'prepositions-place',
    title: 'Prepositions of Place',
    description: 'Where things are. "at school, in the city, on the table, under, above"',
    category: 'Prepositions',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['preposition place', 'at in on place', 'above below under', 'next to between'],
  },
  {
    slug: 'prepositions-movement',
    title: 'Prepositions of Movement',
    description: 'How things move. "go to, come from, walk through, run across"',
    category: 'Prepositions',
    level: 2,
    xpReward: 50,
    prerequisiteSlugs: ['prepositions-place'],
    keywords: ['preposition movement', 'to from through across into', 'movement preposition'],
  },

  // ── CONJUNCTIONS ─────────────────────────────────────────────────────────
  {
    slug: 'conjunctions-coord',
    title: 'Coordinating Conjunctions',
    description: 'Joining equals. "and, but, or, so, for, nor, yet (FANBOYS)"',
    category: 'Conjunctions',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: [],
    keywords: ['coordinating conjunction', 'fanboys', 'and but or so', 'for nor yet'],
  },
  {
    slug: 'conjunctions-subord',
    title: 'Subordinating Conjunctions',
    description: 'Linking clauses. "although, because, if, unless, since, while, when"',
    category: 'Conjunctions',
    level: 2,
    xpReward: 60,
    prerequisiteSlugs: ['conjunctions-coord'],
    keywords: ['subordinating conjunction', 'although because if unless since while when'],
  },
  {
    slug: 'conjunctions-correlative',
    title: 'Correlative Conjunctions',
    description: 'Paired connectors. "either...or, neither...nor, both...and, not only...but also"',
    category: 'Conjunctions',
    level: 3,
    xpReward: 80,
    prerequisiteSlugs: ['conjunctions-subord'],
    keywords: ['correlative conjunction', 'either or', 'neither nor', 'both and', 'not only but also'],
  },

  // ── GERUNDS & INFINITIVES ────────────────────────────────────────────────
  {
    slug: 'gerunds-after-verbs',
    title: 'Gerunds after Verbs',
    description: 'Verb + -ing. "I enjoy swimming. He avoided answering."',
    category: 'Gerunds & Infinitives',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['present-continuous'],
    keywords: ['gerund', 'gerund after verb', 'enjoy doing', 'avoid doing', 'ing after verb'],
  },
  {
    slug: 'infinitives-after-verbs',
    title: 'Infinitives after Verbs',
    description: 'Verb + to. "I want to swim. She decided to leave."',
    category: 'Gerunds & Infinitives',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['infinitive', 'to infinitive', 'want to', 'decide to', 'infinitive after verb'],
  },
  {
    slug: 'gerunds-vs-infinitives',
    title: 'Gerunds vs Infinitives',
    description: 'Meaning difference. "I remember doing vs I remember to do."',
    category: 'Gerunds & Infinitives',
    level: 4,
    xpReward: 100,
    prerequisiteSlugs: ['gerunds-after-verbs', 'infinitives-after-verbs'],
    keywords: ['gerund vs infinitive', 'stop doing stop to do', 'try doing try to do', 'remember doing'],
  },

  // ── PHRASAL VERBS ────────────────────────────────────────────────────────
  {
    slug: 'phrasal-verbs-common',
    title: 'Common Phrasal Verbs',
    description: 'Verb + particle meaning. "give up, look after, break down, run out of"',
    category: 'Phrasal Verbs',
    level: 2,
    xpReward: 60,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['phrasal verb', 'give up look after break down', 'two-word verb', 'turn off'],
  },
  {
    slug: 'phrasal-verbs-separable',
    title: 'Separable Phrasal Verbs',
    description: 'Pronoun placement. "turn it off / turn off the light" (not "turn off it")',
    category: 'Phrasal Verbs',
    level: 3,
    xpReward: 80,
    prerequisiteSlugs: ['phrasal-verbs-common'],
    keywords: ['separable phrasal verb', 'inseparable phrasal verb', 'pronoun position'],
  },

  // ── SENTENCE STRUCTURE ───────────────────────────────────────────────────
  {
    slug: 'question-formation',
    title: 'Question Formation',
    description: 'Yes/No and Wh- questions. "Do you like it? What do you like?"',
    category: 'Sentence Structure',
    level: 1,
    xpReward: 40,
    prerequisiteSlugs: ['present-simple'],
    keywords: ['question formation', 'do does did', 'wh question', 'question word', 'inversion in questions'],
  },
  {
    slug: 'tag-questions',
    title: 'Tag Questions',
    description: 'Short confirmations. "It\'s cold, isn\'t it? You don\'t like it, do you?"',
    category: 'Sentence Structure',
    level: 3,
    xpReward: 70,
    prerequisiteSlugs: ['question-formation'],
    keywords: ['tag question', 'question tag', "isn't it", "don't you", 'auxiliary tag'],
  },
  {
    slug: 'there-is-are',
    title: 'There is / There are',
    description: 'Existence statements. "There are three cats. There is a problem."',
    category: 'Sentence Structure',
    level: 1,
    xpReward: 30,
    prerequisiteSlugs: [],
    keywords: ['there is', 'there are', 'existential there', 'there was were'],
  },
  {
    slug: 'inversion',
    title: 'Inversion',
    description: 'Emphatic word order. "Never have I seen such beauty. Rarely does she..."',
    category: 'Sentence Structure',
    level: 5,
    xpReward: 130,
    prerequisiteSlugs: ['question-formation', 'past-perfect'],
    keywords: ['inversion', 'never have I', 'rarely does', 'not only', 'fronting inversion'],
  },
  {
    slug: 'cleft-sentences',
    title: 'Cleft Sentences',
    description: 'Emphasis & focus. "It was John who called. What I need is rest."',
    category: 'Sentence Structure',
    level: 5,
    xpReward: 130,
    prerequisiteSlugs: ['relative-defining'],
    keywords: ['cleft sentence', 'it was who', 'what I need is', 'pseudo cleft', 'emphasis'],
  },

  // ── WISHES & REGRETS ─────────────────────────────────────────────────────
  {
    slug: 'wish-present',
    title: 'Wish + Past Simple',
    description: 'Wishing things were different now. "I wish I had more time."',
    category: 'Wishes & Regrets',
    level: 3,
    xpReward: 80,
    prerequisiteSlugs: ['conditional-second'],
    keywords: ['wish', 'wish I had', 'wish I were', 'wish past simple'],
  },
  {
    slug: 'wish-past-perfect',
    title: 'Wish + Past Perfect',
    description: 'Regrets about the past. "I wish I had studied harder."',
    category: 'Wishes & Regrets',
    level: 4,
    xpReward: 100,
    prerequisiteSlugs: ['wish-present', 'conditional-third'],
    keywords: ['wish past perfect', 'wish I had done', 'regret', 'if only'],
  },

  // ── ADVANCED GRAMMAR ─────────────────────────────────────────────────────
  {
    slug: 'ellipsis-substitution',
    title: 'Ellipsis & Substitution',
    description: 'Avoiding repetition. "I love pasta and so does she. — I do too."',
    category: 'Advanced Grammar',
    level: 4,
    xpReward: 110,
    prerequisiteSlugs: ['conjunctions-coord'],
    keywords: ['ellipsis', 'substitution', 'so do I', 'neither do I', 'do so', 'avoid repetition'],
  },
  {
    slug: 'fronting',
    title: 'Fronting',
    description: 'Moving elements to front for emphasis. "Brilliant she was. This I cannot accept."',
    category: 'Advanced Grammar',
    level: 5,
    xpReward: 130,
    prerequisiteSlugs: ['inversion'],
    keywords: ['fronting', 'topicalization', 'front element emphasis', 'moved to front'],
  },
  {
    slug: 'discourse-markers',
    title: 'Discourse Markers',
    description: 'Linking ideas. "However, moreover, in addition, on the other hand, nevertheless"',
    category: 'Advanced Grammar',
    level: 3,
    xpReward: 80,
    prerequisiteSlugs: ['conjunctions-subord'],
    keywords: ['discourse marker', 'however moreover', 'furthermore', 'in addition', 'on the other hand', 'linking words'],
  },
];

export const SKILL_CATEGORIES = [
  { name: 'Verb Tenses', icon: '⏱️', color: 'from-blue-500 to-cyan-500' },
  { name: 'Modal Verbs', icon: '🎯', color: 'from-violet-500 to-purple-600' },
  { name: 'Conditionals', icon: '🔀', color: 'from-orange-500 to-amber-500' },
  { name: 'Passive & Causative', icon: '🔄', color: 'from-pink-500 to-rose-600' },
  { name: 'Reported Speech', icon: '💬', color: 'from-teal-500 to-green-500' },
  { name: 'Relative Clauses', icon: '🔗', color: 'from-indigo-500 to-blue-600' },
  { name: 'Articles & Determiners', icon: '📝', color: 'from-yellow-500 to-orange-500' },
  { name: 'Nouns & Pronouns', icon: '👤', color: 'from-emerald-500 to-teal-500' },
  { name: 'Adjectives & Adverbs', icon: '✨', color: 'from-purple-500 to-pink-500' },
  { name: 'Prepositions', icon: '📍', color: 'from-cyan-500 to-blue-500' },
  { name: 'Conjunctions', icon: '🔧', color: 'from-green-500 to-emerald-600' },
  { name: 'Gerunds & Infinitives', icon: '♾️', color: 'from-red-500 to-rose-500' },
  { name: 'Phrasal Verbs', icon: '🚀', color: 'from-amber-500 to-yellow-500' },
  { name: 'Sentence Structure', icon: '🏗️', color: 'from-slate-500 to-gray-600' },
  { name: 'Wishes & Regrets', icon: '🌠', color: 'from-sky-500 to-indigo-500' },
  { name: 'Advanced Grammar', icon: '🧠', color: 'from-fuchsia-500 to-purple-600' },
];

export function mapWeaknessToNodeSlug(weakness: string): string | null {
  if (!weakness || typeof weakness !== 'string') return null;
  const lc = weakness.toLowerCase().trim();
  if (!lc || lc === 'none' || lc === 'null') return null;

  // Pass 1 — exact keyword match (current logic)
  for (const node of GRAMMAR_NODES) {
    for (const keyword of node.keywords) {
      const klc = keyword.toLowerCase();
      if (lc === klc || lc.includes(klc) || klc.includes(lc)) {
        return node.slug;
      }
    }
  }

  // Pass 2 — title match (AI often returns the node title verbatim e.g. "Present Simple")
  for (const node of GRAMMAR_NODES) {
    const titleLc = node.title.toLowerCase();
    if (lc === titleLc || lc.includes(titleLc) || titleLc.includes(lc)) {
      return node.slug;
    }
  }

  // Pass 3 — slug match (AI may already produce a slug-like string)
  const lcSlug = lc.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const node of GRAMMAR_NODES) {
    if (lcSlug === node.slug || node.slug.includes(lcSlug) || lcSlug.includes(node.slug)) {
      return node.slug;
    }
  }

  // No static match found — caller should treat the raw weakness as a custom/dynamic slug
  return null;
}

export function normalizeSkillTopic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function titleFromSkillTopic(input: string): string {
  const source = input.trim() || 'Emerging Skill';
  return source
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function resolveSkillTopic(input: string): { slug: string; title: string; isKnown: boolean } | null {
  if (!input || typeof input !== 'string') return null;

  const mapped = mapWeaknessToNodeSlug(input);
  if (mapped) {
    const node = GRAMMAR_NODES.find((n) => n.slug === mapped);
    return { slug: mapped, title: node?.title ?? titleFromSkillTopic(mapped), isKnown: true };
  }

  const normalized = normalizeSkillTopic(input);
  if (!normalized) return null;

  const direct = GRAMMAR_NODES.find((n) => n.slug === normalized);
  if (direct) return { slug: direct.slug, title: direct.title, isKnown: true };

  return { slug: normalized, title: titleFromSkillTopic(input), isKnown: false };
}
