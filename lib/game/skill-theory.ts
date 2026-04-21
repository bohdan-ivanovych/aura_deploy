export interface SkillTheory {
  slug: string;
  rules: string[];
  examples: string[];
  commonMistakes: string[];
  tips: string[];
}

export const SKILL_THEORY: Record<string, SkillTheory> = {
  // ── VERB TENSES ──────────────────────────────────────────────────────────
  'present-simple': {
    slug: 'present-simple',
    rules: [
      'Used for habits, routines, and general truths.',
      'Add -s/-es to the verb for he/she/it: "She reads."',
      'Use "do/does" for questions and negatives.',
    ],
    examples: [
      'I drink coffee every morning.',
      'The sun rises in the east.',
      "She doesn't like horror movies.",
      'Do you speak French?',
    ],
    commonMistakes: [
      '❌ She read every day. → ✅ She reads every day.',
      "❌ He don't know. → ✅ He doesn't know.",
      '❌ Does she speaks? → ✅ Does she speak?',
    ],
    tips: [
      'Signal words: always, usually, never, every day, often.',
      'Remember: 3rd person singular (he/she/it) always gets -s.',
    ],
  },
  'present-continuous': {
    slug: 'present-continuous',
    rules: [
      'Used for actions happening right now or temporary situations.',
      'Form: am/is/are + verb-ing.',
      'Not used with stative verbs (know, love, want, have).',
    ],
    examples: [
      'She is studying for the exam right now.',
      'They are building a new school.',
      "I'm living with my parents temporarily.",
    ],
    commonMistakes: [
      '❌ I am knowing the answer. → ✅ I know the answer.',
      '❌ She studying. → ✅ She is studying.',
      '❌ He is haveing lunch. → ✅ He is having lunch.',
    ],
    tips: [
      'Signal words: now, right now, at the moment, currently.',
      "Stative verbs (know, like, want, believe) don't use continuous form.",
    ],
  },
  'past-simple': {
    slug: 'past-simple',
    rules: [
      'Used for completed actions at a specific time in the past.',
      'Regular verbs: add -ed (walk → walked).',
      'Irregular verbs must be memorized (go → went, eat → ate).',
      'Use "did" for questions and negatives.',
    ],
    examples: [
      'I visited Paris last summer.',
      "She didn't call me yesterday.",
      'Did you finish your homework?',
    ],
    commonMistakes: [
      '❌ I goed to the store. → ✅ I went to the store.',
      '❌ Did she went? → ✅ Did she go?',
      "❌ He didn't called. → ✅ He didn't call.",
    ],
    tips: [
      'Signal words: yesterday, last week, ago, in 1990, then.',
      'Learn irregular verbs in groups (sing/sang/sung pattern).',
    ],
  },
  'past-continuous': {
    slug: 'past-continuous',
    rules: [
      'Used for ongoing actions in the past, often interrupted by another event.',
      'Form: was/were + verb-ing.',
      'Often used with past simple: "I was eating when she called."',
    ],
    examples: [
      'I was watching TV when you arrived.',
      'They were playing football at 5 PM.',
      "She wasn't sleeping when I knocked.",
    ],
    commonMistakes: [
      '❌ I was watch TV. → ✅ I was watching TV.',
      '❌ We were study all night. → ✅ We were studying all night.',
    ],
    tips: [
      'Signal words: when, while, at that moment, all day long.',
      'The shorter action uses Past Simple; the longer uses Past Continuous.',
    ],
  },
  'present-perfect': {
    slug: 'present-perfect',
    rules: [
      'Used for past actions with present relevance, or life experiences.',
      'Form: have/has + past participle.',
      'Never use with specific time expressions (yesterday, last week).',
    ],
    examples: [
      'I have visited Japan twice.',
      'She has just finished the report.',
      'Have you ever eaten sushi?',
    ],
    commonMistakes: [
      '❌ I have went there yesterday. → ✅ I went there yesterday.',
      '❌ She has finish. → ✅ She has finished.',
      '❌ Did you ever try? → ✅ Have you ever tried?',
    ],
    tips: [
      'Signal words: ever, never, just, already, yet, for, since.',
      'Use "for" with duration, "since" with a starting point.',
    ],
  },
  'present-perfect-continuous': {
    slug: 'present-perfect-continuous',
    rules: [
      'Used for ongoing actions that started in the past and continue now, or recently stopped.',
      'Form: have/has + been + verb-ing.',
      'Emphasises the duration or the fact that the activity is ongoing.',
    ],
    examples: [
      'I have been studying for three hours.',
      'She has been working here since 2019.',
      'They have been arguing all morning.',
    ],
    commonMistakes: [
      '❌ I have been study. → ✅ I have been studying.',
      '❌ She has been work here for years. → ✅ She has been working here for years.',
      '❌ He have been waiting. → ✅ He has been waiting.',
    ],
    tips: [
      'Signal words: for, since, all morning/day/week, lately, recently.',
      'Use this tense (not present perfect simple) when the duration matters.',
    ],
  },
  'past-perfect': {
    slug: 'past-perfect',
    rules: [
      'Used for an action completed before another past action.',
      'Form: had + past participle.',
      'Shows the earlier of two past events.',
    ],
    examples: [
      'I had eaten before she arrived.',
      'He had never seen snow before that day.',
      'By the time I got there, the film had already started.',
    ],
    commonMistakes: [
      '❌ I have eaten before she arrived. → ✅ I had eaten before she arrived.',
      '❌ Had she went? → ✅ Had she gone?',
    ],
    tips: [
      'Signal words: by the time, after, before, already, when, until.',
      'Think of it as "the past of the past."',
    ],
  },
  'past-perfect-continuous': {
    slug: 'past-perfect-continuous',
    rules: [
      'Used for an ongoing action that was in progress before a specific past moment.',
      'Form: had been + verb-ing.',
      'Emphasises the duration of the earlier action.',
    ],
    examples: [
      'She had been studying for five hours when I called.',
      'They had been living there for years before they moved.',
      'He had been waiting so long that he gave up.',
    ],
    commonMistakes: [
      '❌ She had been study. → ✅ She had been studying.',
      '❌ He has been waiting before she came. → ✅ He had been waiting before she came.',
    ],
    tips: [
      'Signal words: for, since, all day — combined with a past event.',
      'It explains the cause of a past situation: "He was tired because he had been running."',
    ],
  },
  'future-will': {
    slug: 'future-will',
    rules: [
      'Used for spontaneous decisions, predictions, promises, and offers.',
      'Form: will + base verb (same for all subjects).',
      'Negative: will not / won\'t.',
    ],
    examples: [
      "I'll help you with that!",
      'It will rain tomorrow.',
      "She won't be at the meeting.",
    ],
    commonMistakes: [
      '❌ He wills go. → ✅ He will go.',
      '❌ I will to call you. → ✅ I will call you.',
      '❌ Will she goes? → ✅ Will she go?',
    ],
    tips: [
      'Use "will" for decisions made at the moment of speaking.',
      'Use "going to" for planned intentions made before speaking.',
    ],
  },
  'future-going-to': {
    slug: 'future-going-to',
    rules: [
      'Used for pre-planned intentions and predictions based on present evidence.',
      'Form: am/is/are + going to + base verb.',
      'Choice between "will" and "going to" changes meaning.',
    ],
    examples: [
      "She's going to study medicine next year.",
      'Look at those clouds — it\'s going to rain.',
      'We are going to move to a new apartment.',
    ],
    commonMistakes: [
      '❌ She going to leave. → ✅ She is going to leave.',
      '❌ I going to call him. → ✅ I am going to call him.',
    ],
    tips: [
      'Plan made before speaking → "going to". Instant decision → "will".',
      'Evidence you can see right now → "going to" for predictions.',
    ],
  },
  'future-continuous': {
    slug: 'future-continuous',
    rules: [
      'Used for an action that will be in progress at a specific future moment.',
      'Form: will be + verb-ing.',
      'Often used to politely ask about plans.',
    ],
    examples: [
      'At 5 PM tomorrow, I will be sitting on the plane.',
      'This time next week, they will be lying on a beach.',
      'Will you be using the car tonight?',
    ],
    commonMistakes: [
      '❌ I will be study. → ✅ I will be studying.',
      '❌ She will studying at 9 AM. → ✅ She will be studying at 9 AM.',
    ],
    tips: [
      'Signal phrases: at this time tomorrow, at 8 o\'clock tonight, this time next week.',
      'Great for polite enquiries: "Will you be needing anything else?"',
    ],
  },
  'future-perfect': {
    slug: 'future-perfect',
    rules: [
      'Used for actions that will be completed before a specific future point.',
      'Form: will have + past participle.',
      'Often used with "by" or "by the time".',
    ],
    examples: [
      'I will have finished the project by Friday.',
      'By next year, she will have saved enough money.',
      'They will have left before you arrive.',
    ],
    commonMistakes: [
      '❌ I will finish by Friday. → might be ok, but ✅ I will have finished is more precise.',
      '❌ She will have finish. → ✅ She will have finished.',
    ],
    tips: [
      'Signal words: by, by the time, before, in X years.',
      'Think of it as looking back from a future point: "By then, it will be done."',
    ],
  },

  // ── MODAL VERBS ──────────────────────────────────────────────────────────
  'modals-can-could': {
    slug: 'modals-can-could',
    rules: [
      '"Can" expresses present ability or permission.',
      '"Could" expresses past ability, polite requests, or possibility.',
      'Both are followed by the base verb — no "to", no -s.',
    ],
    examples: [
      'I can speak three languages.',
      'Could you pass the salt, please?',
      "She couldn't drive when she was young.",
    ],
    commonMistakes: [
      '❌ I can to swim. → ✅ I can swim.',
      '❌ He cans do it. → ✅ He can do it.',
      '❌ Could you to help me? → ✅ Could you help me?',
    ],
    tips: [
      'Can = ability NOW. Could = ability in the past OR polite request.',
      '"Could" is softer and more polite than "can" for requests.',
    ],
  },
  'modals-may-might': {
    slug: 'modals-may-might',
    rules: [
      '"May" and "might" express possibility or permission.',
      '"May" is slightly more likely/formal than "might".',
      'Both followed by base verb, no change for any subject.',
    ],
    examples: [
      'It may rain this afternoon.',
      'She might come to the party.',
      'May I use your phone?',
    ],
    commonMistakes: [
      '❌ It mights rain. → ✅ It might rain.',
      '❌ She may to leave. → ✅ She may leave.',
      '❌ He might knows. → ✅ He might know.',
    ],
    tips: [
      '"May" ≈ 50% chance. "Might" ≈ 30–40% chance.',
      'For formal permission (may I?) "may" sounds more polite than "can".',
    ],
  },
  'modals-must-have-to': {
    slug: 'modals-must-have-to',
    rules: [
      '"Must" = strong internal obligation or logical deduction.',
      '"Have to" = external obligation (rules, laws, other people).',
      '"Must not" = prohibited. "Don\'t have to" = not necessary.',
    ],
    examples: [
      'You must wear a seatbelt.',
      'I have to submit the report by Monday.',
      "She must be tired — she's yawning constantly.",
    ],
    commonMistakes: [
      '❌ He must to leave now. → ✅ He must leave now.',
      "❌ Mustn't = don't have to. → They're different: mustn't = forbidden.",
      '❌ I must to go. → ✅ I must go.',
    ],
    tips: [
      '"Must" = the feeling comes from YOU. "Have to" = external rules.',
      '"Don\'t have to" means not necessary, NOT prohibited.',
    ],
  },
  'modals-should-ought': {
    slug: 'modals-should-ought',
    rules: [
      '"Should" and "ought to" both express advice, expectation, or mild obligation.',
      '"Should" is far more common in everyday speech.',
      '"Ought to" is slightly more formal and implies a moral obligation.',
    ],
    examples: [
      'You should see a doctor.',
      'We ought to respect our elders.',
      "She shouldn't work so late every night.",
    ],
    commonMistakes: [
      '❌ You should to rest. → ✅ You should rest.',
      '❌ He ought go. → ✅ He ought to go.',
      '❌ He shoulds try. → ✅ He should try.',
    ],
    tips: [
      '"Should" = advice / expectation. "Must" = strong obligation.',
      '"Ought to" is rarely used in questions — prefer "should" instead.',
    ],
  },
  'modals-would-used-to': {
    slug: 'modals-would-used-to',
    rules: [
      '"Would" expresses hypothetical situations and past habits.',
      '"Used to" describes past habits or states that no longer exist.',
      '"Would" for habits needs context; "used to" works alone.',
    ],
    examples: [
      'I used to play football every Sunday.',
      'When I was a child, I would visit my grandparents every weekend.',
      "She used to be shy, but now she isn't.",
    ],
    commonMistakes: [
      '❌ I use to wake up early. → ✅ I used to wake up early.',
      '❌ She would be tall when she was young. → ✅ She used to be tall (states, not habits).',
      '❌ Did he used to? → ✅ Did he use to?',
    ],
    tips: [
      '"Used to" works for both habits AND states. "Would" only works for habits.',
      'In questions/negatives: "Did you use to...?" (no -d).',
    ],
  },
  'modal-perfects': {
    slug: 'modal-perfects',
    rules: [
      'Form: modal + have + past participle.',
      '"Must have" = deduction about the past.',
      '"Should/could/might have" = criticism or unfulfilled possibility.',
    ],
    examples: [
      'She must have left already — her bag is gone.',
      'You should have called me earlier.',
      'He could have won if he had practised more.',
    ],
    commonMistakes: [
      '❌ She must have went. → ✅ She must have gone.',
      '❌ You should of told me. → ✅ You should have told me.',
      '❌ He could have win. → ✅ He could have won.',
    ],
    tips: [
      '"Would of / could of / should of" is ALWAYS wrong. It is always "have".',
      '"Must have" = certainty. "Might have" = lower certainty.',
    ],
  },

  // ── CONDITIONALS ─────────────────────────────────────────────────────────
  'conditional-zero': {
    slug: 'conditional-zero',
    rules: [
      'Used for universal truths, scientific facts, and general rules.',
      'Form: If + present simple, present simple.',
      'Both clauses use the same tense.',
    ],
    examples: [
      'If you heat ice, it melts.',
      'If you mix red and blue, you get purple.',
      'Plants die if they don\'t get water.',
    ],
    commonMistakes: [
      '❌ If you heat ice, it will melt. → Possible, but zero conditional drops "will".',
      '❌ If water freezes, it turns into ice → ✅ Correct! (This is zero conditional.)',
    ],
    tips: [
      'Zero conditional = always true. Replace "if" with "when" — same meaning.',
      'Used for instructions, scientific facts, general truths.',
    ],
  },
  'conditional-first': {
    slug: 'conditional-first',
    rules: [
      'Used for real and possible future conditions.',
      'Form: If + present simple, will + base verb.',
      'The "if" clause never uses "will".',
    ],
    examples: [
      'If it rains, I will take an umbrella.',
      'She will come if you invite her.',
      "If you study hard, you'll pass the exam.",
    ],
    commonMistakes: [
      '❌ If it will rain, I will go. → ✅ If it rains, I will go.',
      "❌ If I will see him, I'll tell him. → ✅ If I see him, I'll tell him.",
    ],
    tips: [
      'Never use "will" in the if-clause.',
      'Can also use: unless (= if not), as long as, provided that.',
    ],
  },
  'conditional-second': {
    slug: 'conditional-second',
    rules: [
      'Used for unlikely, imaginary, or hypothetical present/future situations.',
      'Form: If + past simple, would + base verb.',
      'Use "were" (not "was") for all persons in formal writing.',
    ],
    examples: [
      'If I had a million dollars, I would travel the world.',
      'She would be happier if she exercised more.',
      "If I were you, I'd apologize.",
    ],
    commonMistakes: [
      '❌ If I would have more money, I would travel. → ✅ If I had more money...',
      '❌ If he was rich... → ✅ If he were rich... (formal)',
    ],
    tips: [
      'Compare: First = realistic possibility. Second = imaginary/hypothetical.',
      '"If I were you" is a fixed expression even in informal speech.',
    ],
  },
  'conditional-third': {
    slug: 'conditional-third',
    rules: [
      "Used for imaginary past situations — things that didn't happen.",
      'Form: If + past perfect, would have + past participle.',
      'Often expresses regret or criticism.',
    ],
    examples: [
      'If I had studied harder, I would have passed.',
      'She would have called if she had known.',
      "We wouldn't have missed the train if we had left earlier.",
    ],
    commonMistakes: [
      '❌ If I studied more, I would have passed. → ✅ If I had studied more...',
      '❌ I would of gone. → ✅ I would have gone.',
    ],
    tips: [
      "Third conditional is about the PAST — things that can't be changed.",
      '"Would of" is NEVER correct — always "would have".',
    ],
  },
  'conditional-mixed': {
    slug: 'conditional-mixed',
    rules: [
      'Mixes time frames: past condition with present result, or present condition with past result.',
      'Type 1: If + past perfect → would + base verb (past cause, present effect).',
      'Type 2: If + past simple → would have + past participle (present cause, past effect).',
    ],
    examples: [
      'If I had studied medicine, I would be a doctor now.',
      'If she were more organised, she would have finished by now.',
      'If he had moved to London, he would be living there now.',
    ],
    commonMistakes: [
      '❌ If I had studied, I would be doctor now. → ✅ ...I would be a doctor now.',
      '❌ If she was organised, she would have finished. → ✅ If she were organised...',
    ],
    tips: [
      'Mixed conditionals are advanced — they cross time boundaries.',
      'Ask yourself: Which part is about the past? Which about the present?',
    ],
  },

  // ── PASSIVE & CAUSATIVE ───────────────────────────────────────────────────
  'passive-basic': {
    slug: 'passive-basic',
    rules: [
      'Used when the action is more important than who performs it.',
      'Form: be + past participle (tense changes "be").',
      'The agent can be added with "by".',
    ],
    examples: [
      'The book was written by Tolstoy.',
      'The windows are cleaned every week.',
      'The project will be completed by Friday.',
    ],
    commonMistakes: [
      '❌ The book was wrote by her. → ✅ The book was written by her.',
      '❌ It is been cleaned. → ✅ It has been cleaned.',
    ],
    tips: [
      'Focus on the object, not the subject.',
      'Passive is common in formal writing, scientific texts, and news.',
    ],
  },
  'passive-advanced': {
    slug: 'passive-advanced',
    rules: [
      'Impersonal passive: "It is said that..." / "It is believed that..."',
      'Personal passive: "She is said to be brilliant."',
      'Can be used with modal verbs: "The project should be finished."',
    ],
    examples: [
      'It is believed that he stole the money.',
      'She is reported to be in serious condition.',
      'The results are thought to be significant.',
    ],
    commonMistakes: [
      '❌ It is believe that... → ✅ It is believed that...',
      '❌ She is said be brilliant. → ✅ She is said to be brilliant.',
    ],
    tips: [
      'Common reporting verbs in passive: said, believed, thought, reported, known, expected.',
      'Personal passive is often preferred in journalism to sound neutral.',
    ],
  },
  'causative-have-get': {
    slug: 'causative-have-get',
    rules: [
      'Used when someone arranges for another person to do something.',
      '"Have" causative: have + object + past participle.',
      '"Get" causative: get + object + past participle (slightly more informal).',
    ],
    examples: [
      'I had my hair cut yesterday.',
      'She got her car repaired at the garage.',
      "We're having the house painted next week.",
    ],
    commonMistakes: [
      '❌ I had my hair cutting. → ✅ I had my hair cut.',
      '❌ She got her car repair. → ✅ She got her car repaired.',
    ],
    tips: [
      'The object receives the action — use the past participle after it.',
      '"Get it done" is more informal; "have it done" is more formal.',
    ],
  },

  // ── REPORTED SPEECH ───────────────────────────────────────────────────────
  'reported-statements': {
    slug: 'reported-statements',
    rules: [
      'When reporting past speech, tenses shift back one step (backshift).',
      '"say/tell" — "tell" needs an object (told me), "say" does not.',
      'Time expressions also change: today → that day, now → then.',
    ],
    examples: [
      '"I love you." → He said he loved her.',
      '"I am tired." → She said she was tired.',
      '"I have finished." → He said he had finished.',
    ],
    commonMistakes: [
      '❌ She said me that... → ✅ She told me that...',
      '❌ He said he will come. → ✅ He said he would come.',
    ],
    tips: [
      'Backshift: is→was, have→had, will→would, can→could, may→might.',
      '"Tell" always needs a person: He told me (not: he told that).',
    ],
  },
  'reported-questions': {
    slug: 'reported-questions',
    rules: [
      'Reported questions use statement word order (subject + verb), NOT question word order.',
      'Yes/No questions use "if" or "whether".',
      'Wh- questions keep the question word but use statement order.',
    ],
    examples: [
      '"Are you ready?" → She asked if I was ready.',
      '"Where do you live?" → He asked where I lived.',
      '"What time is it?" → She wondered what time it was.',
    ],
    commonMistakes: [
      '❌ He asked where was I. → ✅ He asked where I was.',
      '❌ She asked did I want coffee. → ✅ She asked if I wanted coffee.',
    ],
    tips: [
      'No auxiliary verb (do/did) in reported questions.',
      'Change the question mark to a full stop — it is no longer a direct question.',
    ],
  },
  'reported-commands': {
    slug: 'reported-commands',
    rules: [
      'Commands and requests are reported with "tell/ask + object + to-infinitive".',
      'Negative commands use "not to".',
      'Verb changes: "Don\'t run" → He told me not to run.',
    ],
    examples: [
      '"Sit down!" → He told me to sit down.',
      '"Please help me." → She asked him to help her.',
      '"Don\'t touch that." → She told the child not to touch it.',
    ],
    commonMistakes: [
      '❌ She told me sit down. → ✅ She told me to sit down.',
      '❌ He asked me that I leave. → ✅ He asked me to leave.',
    ],
    tips: [
      '"Tell" = authority. "Ask" = polite request.',
      'Always use "to + base verb" or "not to + base verb".',
    ],
  },

  // ── RELATIVE CLAUSES ─────────────────────────────────────────────────────
  'relative-defining': {
    slug: 'relative-defining',
    rules: [
      'Defines or identifies the noun — essential to the meaning of the sentence.',
      '"Who" for people, "which" for things, "that" for people or things.',
      'No commas around a defining relative clause.',
    ],
    examples: [
      'The man who called you is my uncle.',
      'The book that I read was amazing.',
      'The restaurant where we met has closed.',
    ],
    commonMistakes: [
      '❌ The man which called. → ✅ The man who called.',
      '❌ The girl, who studies hard, passed. → If essential, remove the commas.',
    ],
    tips: [
      '"That" can replace "who" or "which" in defining clauses.',
      'Remove the clause — if the sentence no longer makes sense, it is defining.',
    ],
  },
  'relative-non-defining': {
    slug: 'relative-non-defining',
    rules: [
      'Adds extra information about a noun that is already identified.',
      'Always separated by commas — removing it does not change core meaning.',
      '"That" CANNOT be used in non-defining clauses.',
    ],
    examples: [
      'My sister, who lives in London, is a doctor.',
      'The Eiffel Tower, which was built in 1889, is in Paris.',
      "My boss, whose name I can never remember, is very kind.",
    ],
    commonMistakes: [
      '❌ The car, that I bought, is new. → ✅ The car, which I bought, is new.',
      '❌ My friend who is a doctor lives in Paris. → Add commas if extra info.',
    ],
    tips: [
      'Test: can you remove the clause without losing the main meaning? → Non-defining.',
      '"Whose" is used for possession in both defining and non-defining clauses.',
    ],
  },
  'relative-reduced': {
    slug: 'relative-reduced',
    rules: [
      'The relative pronoun and "be" can be omitted to shorten relative clauses.',
      'Active voice: use present participle (-ing). Passive voice: use past participle.',
      'Only possible when the relative pronoun is the subject.',
    ],
    examples: [
      'The boy who is playing outside → The boy playing outside.',
      'The car that was stolen → The car stolen.',
      'The woman who runs the shop is my aunt → The woman running the shop.',
    ],
    commonMistakes: [
      '❌ The man read the book. (reducing "The man who read the book")  → ✅ The man reading the book.',
      '❌ The report written by she → ✅ The report written by her.',
    ],
    tips: [
      '-ing = active (the boy who is playing → the boy playing).',
      '-ed = passive (the cake that was baked → the cake baked).',
    ],
  },

  // ── ARTICLES & DETERMINERS ───────────────────────────────────────────────
  'articles-a-an-the': {
    slug: 'articles-a-an-the',
    rules: [
      '"A/an" = indefinite (first mention, one of many, jobs).',
      '"The" = definite (specific, already known, unique things).',
      'Use "an" before vowel sounds, "a" before consonant sounds.',
    ],
    examples: [
      'I saw a dog. The dog was barking.',
      'She plays the piano beautifully.',
      'He is an engineer.',
    ],
    commonMistakes: [
      '❌ I am student. → ✅ I am a student.',
      '❌ The life is short. → ✅ Life is short.',
      '❌ She plays piano. → ✅ She plays the piano.',
    ],
    tips: [
      '"An hour" (vowel sound), "a university" (consonant sound "y").',
      'Use "the" for unique things: the sun, the moon, the government.',
    ],
  },
  'articles-zero': {
    slug: 'articles-zero',
    rules: [
      'No article is used with plural nouns in general statements.',
      'No article with uncountable nouns used generally.',
      'No article before proper nouns (names, countries, languages).',
    ],
    examples: [
      'Water is essential for life.',
      'I love music.',
      'She speaks French.',
    ],
    commonMistakes: [
      '❌ The English is a global language. → ✅ English is a global language.',
      '❌ She went to the home. → ✅ She went home.',
      '❌ The dogs are loyal. (general) → ✅ Dogs are loyal.',
    ],
    tips: [
      'Fixed phrases with zero article: go to school, at work, in bed, by car.',
      'Meals, games, sports, languages, academic subjects: no article.',
    ],
  },
  'quantifiers': {
    slug: 'quantifiers',
    rules: [
      '"Much/little" = uncountable. "Many/few" = countable.',
      '"A lot of/plenty of/some/any" work with both.',
      '"A few" = some (positive). "Few" = almost none (negative).',
    ],
    examples: [
      'There is a lot of traffic today.',
      'I have few friends here — I feel lonely.',
      'I have a few minutes — let\'s talk.',
    ],
    commonMistakes: [
      '❌ There are much people. → ✅ There are many people.',
      '❌ I have many money. → ✅ I have a lot of money.',
      '❌ She ate less biscuits. → ✅ She ate fewer biscuits.',
    ],
    tips: [
      '"Less" = uncountable (less water). "Fewer" = countable (fewer cars).',
      '"A little" = some. "Little" = almost none (same pattern as few/a few).',
    ],
  },

  // ── NOUNS & PRONOUNS ─────────────────────────────────────────────────────
  'countable-uncountable': {
    slug: 'countable-uncountable',
    rules: [
      'Countable: can be counted, has plural form (apple/apples).',
      "Uncountable: can't be counted individually (water, advice, money).",
      '"Some/any" can be used with both; "many" = countable; "much" = uncountable.',
    ],
    examples: [
      'I need some advice. (uncountable)',
      'There are many apples. (countable)',
      'She has a lot of money. (uncountable)',
    ],
    commonMistakes: [
      '❌ I have many informations. → ✅ I have much information.',
      '❌ She gave me an advice. → ✅ She gave me some advice.',
    ],
    tips: [
      'Uncountable nouns are never plural: news, luggage, furniture, weather.',
      'Use "a piece of" to quantify uncountables: a piece of advice.',
    ],
  },
  'plural-nouns': {
    slug: 'plural-nouns',
    rules: [
      'Most nouns: add -s (cat → cats) or -es (bus → buses).',
      'Irregular plurals must be memorized: child→children, man→men, tooth→teeth.',
      'Some nouns are the same in singular and plural: sheep, fish, deer.',
    ],
    examples: [
      'The children are playing in the park.',
      'She has two criteria for the job.',
      'The mice ran under the shelf.',
    ],
    commonMistakes: [
      '❌ Two childs. → ✅ Two children.',
      '❌ The criterias. → ✅ The criteria.',
      '❌ Three sheeps. → ✅ Three sheep.',
    ],
    tips: [
      'Latin/Greek words often have irregular plurals: datum→data, medium→media.',
      'When in doubt, check a dictionary — many irregular plurals are common words.',
    ],
  },
  'pronouns-personal': {
    slug: 'pronouns-personal',
    rules: [
      'Subject pronouns (I, he, she, they) are used as the subject of a verb.',
      'Object pronouns (me, him, her, them) follow verbs and prepositions.',
      'Possessive adjectives (my, his, her) go before a noun; possessive pronouns (mine, his, hers) stand alone.',
    ],
    examples: [
      'She gave him the book.',
      'That bag is mine, not hers.',
      'They told us about it.',
    ],
    commonMistakes: [
      '❌ Me and John went. → ✅ John and I went.',
      '❌ Between you and I. → ✅ Between you and me.',
      '❌ Its mine. → ✅ It\'s mine.',
    ],
    tips: [
      'Remove the other person to test: "Me went" sounds wrong → use "I".',
      'After prepositions (with, for, between), always use object pronouns.',
    ],
  },
  'reflexive-pronouns': {
    slug: 'reflexive-pronouns',
    rules: [
      'Used when the subject and object of a verb are the same person.',
      'Forms: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.',
      'Emphatic use: "I did it myself" (= without help).',
    ],
    examples: [
      'She cut herself while cooking.',
      'He taught himself to play guitar.',
      'We enjoyed ourselves at the party.',
    ],
    commonMistakes: [
      '❌ She cut her. → ✅ She cut herself.',
      '❌ Theirself / theirselves. → ✅ Themselves.',
      '❌ I see myself in mirror. → ✅ I see myself in the mirror.',
    ],
    tips: [
      '"By myself" = alone / without help. Do not confuse with the simple reflexive.',
      "Don't use a reflexive when a regular pronoun is fine: \"I hurt me\" is wrong.",
    ],
  },

  // ── ADJECTIVES & ADVERBS ─────────────────────────────────────────────────
  'adjective-order': {
    slug: 'adjective-order',
    rules: [
      'When multiple adjectives precede a noun, they follow a strict order.',
      'Order: Opinion → Size → Age → Shape → Colour → Origin → Material → Purpose + Noun.',
      'Native speakers follow this instinctively; violations sound unnatural.',
    ],
    examples: [
      'A beautiful small old round green French silver whittling knife.',
      'A lovely big black dog.',
      'Three small wooden chairs.',
    ],
    commonMistakes: [
      '❌ A red small ball. → ✅ A small red ball.',
      '❌ An Italian old painting. → ✅ An old Italian painting.',
    ],
    tips: [
      'Mnemonic: OSASCOMP (Opinion, Size, Age, Shape, Colour, Origin, Material, Purpose).',
      'In practice, we rarely use more than two or three adjectives together.',
    ],
  },
  'comparatives': {
    slug: 'comparatives',
    rules: [
      'Short adjectives (1–2 syllables): add -er (faster, taller).',
      'Long adjectives (3+ syllables): use "more" (more interesting).',
      'Irregular: good→better, bad→worse, far→farther/further.',
    ],
    examples: [
      'This car is faster than mine.',
      'English is more complex than I thought.',
      'Today is worse than yesterday.',
    ],
    commonMistakes: [
      '❌ She is more tall than me. → ✅ She is taller than me.',
      '❌ He is gooder. → ✅ He is better.',
      '❌ More fast than... → ✅ Faster than...',
    ],
    tips: [
      'One/two syllables → -er. Three or more → more.',
      'After comparatives, use "than" not "then".',
    ],
  },
  'superlatives': {
    slug: 'superlatives',
    rules: [
      'Short adjectives: the + -est (the fastest).',
      'Long adjectives: the most + adjective.',
      'Irregular: good→best, bad→worst, far→farthest.',
    ],
    examples: [
      'She is the tallest person in the class.',
      "That was the most exciting game I've seen.",
      'He is the worst driver ever.',
    ],
    commonMistakes: [
      '❌ She is most tall. → ✅ She is the tallest.',
      '❌ This is most good. → ✅ This is the best.',
    ],
    tips: [
      'Always use "the" before superlatives.',
      'In + place/group: She is the smartest in the class.',
    ],
  },
  'adverbs-types': {
    slug: 'adverbs-types',
    rules: [
      'Manner adverbs (carefully, quickly) go after the verb or object.',
      'Frequency adverbs (always, often, never) go before the main verb but after "be".',
      'Degree adverbs (very, quite, too, enough) go before adjectives or other adverbs.',
    ],
    examples: [
      'She sings beautifully.',
      'I always drink coffee in the morning.',
      'He is quite tall.',
    ],
    commonMistakes: [
      '❌ She sings beautiful. → ✅ She sings beautifully.',
      '❌ I drink always coffee. → ✅ I always drink coffee.',
      '❌ He is enough tall. → ✅ He is tall enough.',
    ],
    tips: [
      '"Enough" goes AFTER adjectives: "good enough", not "enough good".',
      'Watch out for adjective/adverb confusion: "She looks good" (adj) vs "She sings well" (adv).',
    ],
  },

  // ── PREPOSITIONS ─────────────────────────────────────────────────────────
  'prepositions-time': {
    slug: 'prepositions-time',
    rules: [
      '"At" for specific times: at 5 PM, at noon, at night.',
      '"On" for days and dates: on Monday, on July 4th.',
      '"In" for longer periods: in the morning, in July, in 2020.',
    ],
    examples: [
      "The meeting is at 3 o'clock.",
      'She was born on a Tuesday.',
      'We always travel in the summer.',
    ],
    commonMistakes: [
      '❌ I wake up in 7 AM. → ✅ I wake up at 7 AM.',
      '❌ We met at Monday. → ✅ We met on Monday.',
      '❌ She was born in 15 March. → ✅ She was born on 15 March.',
    ],
    tips: [
      'Think: AT = a point, ON = a surface (day), IN = inside (period).',
      '"At night" / "in the morning" — these are fixed expressions!',
    ],
  },
  'prepositions-place': {
    slug: 'prepositions-place',
    rules: [
      '"At" for specific locations or points (at school, at the door, at 10 Park Lane).',
      '"In" for enclosed spaces or areas (in the room, in London, in the water).',
      '"On" for surfaces and positions on a line (on the table, on the wall, on the bus).',
    ],
    examples: [
      'She is at work.',
      'He lives in Paris.',
      'The book is on the shelf.',
    ],
    commonMistakes: [
      '❌ She is in the bus. → ✅ She is on the bus.',
      '❌ He arrived on the airport. → ✅ He arrived at the airport.',
      '❌ I live at France. → ✅ I live in France.',
    ],
    tips: [
      'On transport you ride (bus, train, plane) — on. In a car — in.',
      '"At" is used for activities: at a party, at a concert, at school, at the cinema.',
    ],
  },
  'prepositions-movement': {
    slug: 'prepositions-movement',
    rules: [
      '"To" shows movement toward a destination.',
      '"Through" means passing from one side to the other.',
      '"Across", "along", "past", "into", "out of", "over", "under" all show paths.',
    ],
    examples: [
      "She walked to the station.",
      'The cat ran through the garden.',
      'He drove across the bridge.',
    ],
    commonMistakes: [
      '❌ She went to home. → ✅ She went home. (no "to" with home)',
      '❌ He ran across the tunnel. → ✅ He ran through the tunnel.',
    ],
    tips: [
      '"To" = destination. "Towards" = direction (may not reach it).',
      '"Into" = entering. "Out of" = exiting. Visualise the path!',
    ],
  },

  // ── CONJUNCTIONS ─────────────────────────────────────────────────────────
  'conjunctions-coord': {
    slug: 'conjunctions-coord',
    rules: [
      'Connect two equal elements (words, phrases, or independent clauses).',
      'The FANBOYS: For, And, Nor, But, Or, Yet, So.',
      'Use a comma before a coordinating conjunction that joins two full clauses.',
    ],
    examples: [
      'I like tea, but she prefers coffee.',
      'He was tired, yet he kept working.',
      'She studied hard, so she passed.',
    ],
    commonMistakes: [
      '❌ I like tea but I don\'t like coffee without comma → ✅ I like tea, but I don\'t like coffee. (two full clauses)',
      '❌ He ate fast and healthy. → ✅ He ate quickly and healthily.',
    ],
    tips: [
      'FANBOYS: For (reason), And (addition), Nor (negative addition), But (contrast), Or (choice), Yet (contrast), So (result).',
      'Comma + FANBOYS = compound sentence.',
    ],
  },
  'conjunctions-subord': {
    slug: 'conjunctions-subord',
    rules: [
      'Subordinating conjunctions connect a main clause to a dependent clause.',
      'Common ones: although, because, if, unless, since, while, when, after, before.',
      'If the dependent clause comes first, use a comma after it.',
    ],
    examples: [
      'Although it was cold, she wore a light jacket.',
      "I stayed home because I wasn't feeling well.",
      'Unless you hurry, we will miss the train.',
    ],
    commonMistakes: [
      '❌ Despite she was tired, she worked. → ✅ Although she was tired, she worked.',
      '❌ Because of she left. → ✅ Because she left. / Because of her departure.',
    ],
    tips: [
      '"Because" introduces a clause (because + subject + verb). "Because of" introduces a noun.',
      '"Although/even though" vs "despite/in spite of" — one needs a clause, the other a noun.',
    ],
  },
  'conjunctions-correlative': {
    slug: 'conjunctions-correlative',
    rules: [
      'Correlative conjunctions come in pairs and connect balanced elements.',
      'Pairs: either...or, neither...nor, both...and, not only...but also, whether...or.',
      'The elements after each pair should be grammatically parallel.',
    ],
    examples: [
      'Either you apologise or I leave.',
      'She is both intelligent and kind.',
      'Not only did he win, but he also broke the record.',
    ],
    commonMistakes: [
      '❌ Neither he came nor she. → ✅ Neither he nor she came.',
      '❌ Both singing and to dance. → ✅ Both singing and dancing.',
    ],
    tips: [
      'Parallelism is key: both VERB + VERB, both NOUN + NOUN.',
      '"Not only...but also" inverts the first clause when it starts the sentence.',
    ],
  },

  // ── GERUNDS & INFINITIVES ────────────────────────────────────────────────
  'gerunds-after-verbs': {
    slug: 'gerunds-after-verbs',
    rules: [
      'Gerund (-ing form) is used as a noun, especially after certain verbs.',
      'Verbs followed by gerund: enjoy, avoid, finish, mind, suggest, consider, deny.',
      'After prepositions, always use the gerund.',
    ],
    examples: [
      'I enjoy swimming in the sea.',
      'He avoided answering the question.',
      'She is good at drawing.',
    ],
    commonMistakes: [
      '❌ I enjoy to swim. → ✅ I enjoy swimming.',
      '❌ He avoided to answer. → ✅ He avoided answering.',
      '❌ She is good at draw. → ✅ She is good at drawing.',
    ],
    tips: [
      'Prepositions (at, of, for, about, in) are ALWAYS followed by gerunds.',
      'Memorise: enjoy, mind, finish, avoid, suggest, consider, deny, miss, practise + -ing.',
    ],
  },
  'infinitives-after-verbs': {
    slug: 'infinitives-after-verbs',
    rules: [
      'The to-infinitive is used after certain verbs.',
      'Verbs followed by to-infinitive: want, decide, refuse, hope, plan, promise, afford.',
      'Some verbs take object + to-infinitive: tell, ask, advise, allow, remind.',
    ],
    examples: [
      'She decided to leave early.',
      'He refused to apologise.',
      'I told her to call me.',
    ],
    commonMistakes: [
      '❌ She decided leaving. → ✅ She decided to leave.',
      '❌ I want going. → ✅ I want to go.',
      '❌ He told me call him. → ✅ He told me to call him.',
    ],
    tips: [
      'Memorise: want, decide, refuse, hope, plan, promise, afford, manage + to.',
      'After "let" and "make" use bare infinitive (no "to"): She made me laugh.',
    ],
  },
  'gerunds-vs-infinitives': {
    slug: 'gerunds-vs-infinitives',
    rules: [
      'Some verbs take gerund OR infinitive with NO difference in meaning (like, love, hate, start).',
      'Some verbs change meaning: stop/remember/forget/try + gerund vs infinitive.',
      '"Stop doing" = cease. "Stop to do" = pause in order to do.',
    ],
    examples: [
      'I stopped smoking. (= quit)',
      'I stopped to smoke. (= paused what I was doing, in order to smoke)',
      'She remembered posting the letter. (= recalls having done it)',
    ],
    commonMistakes: [
      '❌ I remember to meet her yesterday. → ✅ I remember meeting her.',
      '❌ Try eating less sugar? / Try to eat less? → Both OK, different meaning.',
    ],
    tips: [
      'Gerund = actual action that happened. Infinitive = action yet to happen.',
      '"Forget doing" = forgetting a past action. "Forget to do" = not remembering a future task.',
    ],
  },

  // ── PHRASAL VERBS ────────────────────────────────────────────────────────
  'phrasal-verbs-common': {
    slug: 'phrasal-verbs-common',
    rules: [
      'A phrasal verb = verb + particle (preposition or adverb) with a new, idiomatic meaning.',
      'The meaning is often NOT literal: "give up" does not mean "give something upward".',
      'Particles include: up, down, out, off, away, back, over, on, in.',
    ],
    examples: [
      "She gave up smoking last year.",
      'The car broke down on the motorway.',
      'Can you look after my cat this weekend?',
    ],
    commonMistakes: [
      '❌ She gave up to smoke. → ✅ She gave up smoking.',
      '❌ I look after of him. → ✅ I look after him.',
    ],
    tips: [
      'Learn phrasal verbs in context, not as isolated translations.',
      'Some phrasal verbs are transitive (need an object), some are intransitive.',
    ],
  },
  'phrasal-verbs-separable': {
    slug: 'phrasal-verbs-separable',
    rules: [
      'Separable phrasal verbs: the particle can be placed after the object.',
      'When the object is a pronoun, it MUST go between the verb and particle.',
      'Inseparable phrasal verbs: the particle can never be separated from the verb.',
    ],
    examples: [
      'Turn off the light. / Turn the light off.',
      'Turn it off. (pronoun must split it)',
      'She looks after her sister. (inseparable — not: "looks her sister after")',
    ],
    commonMistakes: [
      '❌ Turn off it. → ✅ Turn it off.',
      '❌ She looked her children after. → ✅ She looked after her children.',
    ],
    tips: [
      'Pronoun → always goes in the middle: "pick it up", "turn it off", "write it down".',
      'Look for the pattern in dictionaries — they mark separable/inseparable.',
    ],
  },

  // ── SENTENCE STRUCTURE ───────────────────────────────────────────────────
  'question-formation': {
    slug: 'question-formation',
    rules: [
      'Yes/No questions: invert subject and auxiliary (Do you...? / Is she...?).',
      'Wh- questions: Wh- word + auxiliary + subject + verb.',
      'When the question word IS the subject, no auxiliary needed: "Who called?"',
    ],
    examples: [
      'Do you like pizza?',
      'What does she want?',
      'Who broke the window? (who = subject)',
    ],
    commonMistakes: [
      '❌ What you like? → ✅ What do you like?',
      '❌ Where she goes? → ✅ Where does she go?',
      '❌ Who did called? → ✅ Who called? (who = subject)',
    ],
    tips: [
      'If the Wh- word is the subject, no do/does/did: "Who knows?" "What happened?"',
      'For "why" questions, the answer uses "because".',
    ],
  },
  'tag-questions': {
    slug: 'tag-questions',
    rules: [
      'A tag question checks or confirms information.',
      'Positive statement → negative tag. Negative statement → positive tag.',
      'The tag must use the same auxiliary verb as the main clause.',
    ],
    examples: [
      "It's cold, isn't it?",
      "She doesn't like it, does she?",
      'You have met him before, haven\'t you?',
    ],
    commonMistakes: [
      "❌ She is smart, isn't she? → Wait, that's actually correct!",
      "❌ He can swim, can't he be? → ✅ He can swim, can't he?",
      "❌ I am right, amn't I? → ✅ I am right, aren't I? (informal)",
    ],
    tips: [
      'Positive + negative tag = not sure, asking. Negative + positive tag = more certain.',
      '"Let\'s go, shall we?" and "I\'m right, aren\'t I?" are fixed expressions.',
    ],
  },
  'there-is-are': {
    slug: 'there-is-are',
    rules: [
      '"There is" = singular or uncountable. "There are" = plural.',
      '"There was/were" for past. "There will be" for future.',
      '"There" is a grammatical subject — the real subject comes after the verb.',
    ],
    examples: [
      'There is a cat on the roof.',
      'There are three problems with this plan.',
      'Is there any milk left?',
    ],
    commonMistakes: [
      '❌ There is two people. → ✅ There are two people.',
      '❌ There are a problem. → ✅ There is a problem.',
      '❌ Is there any apples? → ✅ Are there any apples?',
    ],
    tips: [
      'The verb agrees with the real subject that follows: "There is A cat" / "There are THREE cats".',
      'In questions, invert: "Is there...? / Are there...? / Was there...?"',
    ],
  },
  'inversion': {
    slug: 'inversion',
    rules: [
      'Inversion = placing the auxiliary before the subject for emphasis.',
      'Triggered by negative adverbials at the start: Never, Rarely, Not only, Hardly, Scarcely, No sooner.',
      'Also used after "so + adjective" and in certain conditionals.',
    ],
    examples: [
      'Never have I seen such beauty.',
      'Not only did she win, but she broke the record.',
      'Had I known, I would have helped.',
    ],
    commonMistakes: [
      '❌ Never I have been here. → ✅ Never have I been here.',
      '❌ Not only she won, but she also smiled. → ✅ Not only did she win...',
    ],
    tips: [
      'Inversion makes writing formal and emphatic — common in literature and speeches.',
      '"Had I known" = "If I had known" — inversion can replace "if" in conditionals.',
    ],
  },
  'cleft-sentences': {
    slug: 'cleft-sentences',
    rules: [
      '"It" clefts: It was [X] that/who... — emphasises the subject/object.',
      '"Wh-" clefts (pseudo-clefts): What I need is/What matters is...',
      'Clefts move focus to one part of the sentence.',
    ],
    examples: [
      "It was John who called, not me.",
      'What I need right now is sleep.',
      "It was the noise that woke me up.",
    ],
    commonMistakes: [
      '❌ It was John called. → ✅ It was John who called.',
      '❌ What I need it is rest. → ✅ What I need is rest.',
    ],
    tips: [
      'Use clefts to correct a misunderstanding: "It was MARY who did it, not Jane."',
      '"Wh-" clefts (what-clefts) are powerful for emphasis in formal writing.',
    ],
  },

  // ── WISHES & REGRETS ─────────────────────────────────────────────────────
  'wish-present': {
    slug: 'wish-present',
    rules: [
      '"Wish + past simple" expresses a desire for things to be different now.',
      'Use "were" (not "was") for all subjects in formal usage.',
      '"If only" is more emphatic than "I wish".',
    ],
    examples: [
      'I wish I had more time.',
      'She wishes she were taller.',
      'If only I knew the answer!',
    ],
    commonMistakes: [
      '❌ I wish I have more money. → ✅ I wish I had more money.',
      '❌ I wish he is here. → ✅ I wish he were here.',
    ],
    tips: [
      'The grammar mirrors the second conditional: imaginary/unreal.',
      '"I wish I could fly" = present wish for an ability you lack.',
    ],
  },
  'wish-past-perfect': {
    slug: 'wish-past-perfect',
    rules: [
      '"Wish + past perfect" expresses regret about past events.',
      'Form: wish + had + past participle.',
      '"If only" with past perfect sounds even more emphatic and emotional.',
    ],
    examples: [
      'I wish I had studied harder.',
      "She wishes she hadn't said that.",
      'If only I had left earlier!',
    ],
    commonMistakes: [
      '❌ I wish I studied harder. → ✅ I wish I had studied harder.',
      '❌ I wish I would have gone. → ✅ I wish I had gone.',
    ],
    tips: [
      'Past perfect = the regret is about the PAST and cannot be changed.',
      '"I wish I could have..." = wish about a missed opportunity to do something.',
    ],
  },

  // ── ADVANCED GRAMMAR ─────────────────────────────────────────────────────
  'ellipsis-substitution': {
    slug: 'ellipsis-substitution',
    rules: [
      'Ellipsis = omitting words already understood from context.',
      'Substitution = replacing repeated words with "do/does/did", "so", "one".',
      'Common substitution: "I think so", "I hope so", "I hope not".',
    ],
    examples: [
      '"Are you coming?" "I am." (ellipsis — not repeating "coming")',
      '"I love pasta and so does she."',
      '"Can you help?" "I\'ll try to." (ellipsis of the verb)',
    ],
    commonMistakes: [
      '❌ I love pasta and so she does. → ✅ I love pasta and so does she.',
      '❌ I think so it. → ✅ I think so.',
    ],
    tips: [
      '"So do I" (agreement with positive). "Neither do I" (agreement with negative).',
      'Ellipsis makes speech natural and avoids unnecessary repetition.',
    ],
  },
  'fronting': {
    slug: 'fronting',
    rules: [
      'Fronting = moving an element to the front of the sentence for emphasis.',
      'The focused element goes first, followed by the rest of the clause.',
      'Often used with adjectives, adverbials, and objects.',
    ],
    examples: [
      'This I cannot accept. (object fronted)',
      'Brilliant she was. (adjective fronted)',
      'In my heart, I always knew.',
    ],
    commonMistakes: [
      '❌ Brilliant was she. → ✅ Brilliant she was. (no inversion with non-auxiliary)',
      '❌ The money, I gave it to him. → ✅ The money I gave him. (avoid pronoun repetition)',
    ],
    tips: [
      'Fronting is a literary/formal device — more common in writing than speech.',
      'Contrast with inversion: fronting moves the focus; inversion rearranges the verb too.',
    ],
  },
  'discourse-markers': {
    slug: 'discourse-markers',
    rules: [
      'Discourse markers organise and link ideas in speech and writing.',
      'Adding: furthermore, in addition, moreover, also.',
      'Contrasting: however, nevertheless, on the other hand, even so.',
      'Concluding: therefore, as a result, in conclusion, consequently.',
    ],
    examples: [
      'However, the results were inconclusive.',
      'Furthermore, the study shows clear benefits.',
      'In conclusion, regular exercise improves mental health.',
    ],
    commonMistakes: [
      '❌ However I agree. → ✅ However, I agree. (comma after discourse marker)',
      '❌ Despite, it was hard. → ✅ Despite this, it was hard.',
    ],
    tips: [
      'Always follow sentence-starting discourse markers with a comma.',
      '"Moreover" adds a stronger point. "Furthermore" is neutral addition.',
    ],
  },
};

export function getTheory(slug: string): SkillTheory | null {
  return SKILL_THEORY[slug] ?? null;
}

export const DEFAULT_THEORY: SkillTheory = {
  slug: 'default',
  rules: ['Study this grammar rule carefully with real examples.'],
  examples: ['Practice makes perfect — use this structure in conversation.'],
  commonMistakes: ['Watch out for common errors native learners make.'],
  tips: ['Try to use this structure in your next chat session for bonus XP!'],
};
