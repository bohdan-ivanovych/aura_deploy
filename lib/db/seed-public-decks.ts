import prisma from '@/lib/db/prisma';

/**
 * Seeds the public flashcard library with preset vocabulary packs.
 * Safe to call multiple times \u2014 only runs if no public decks exist.
 */
export async function seedPublicDecks() {
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) return;

  const existingCount = await prisma.deck.count({ where: { isPublic: true } });
  if (existingCount > 0) return;

  const decks = [
    {
      title: 'Essential IT Vocabulary',
      description: 'Must-know words for Software Engineers and IT professionals.',
      likesCount: 120,
      cards: [
        { front: 'Deployment', back: 'Розгортання', explanation: 'The process of moving software from a dev environment to production.', ctx: 'The deployment to the production server was successful.' },
        { front: 'Bandwidth', back: 'Пропускна здатність', explanation: 'The maximum rate of data transfer across a given path.', ctx: 'We need more bandwidth to handle the increased traffic.' },
        { front: 'Refactoring', back: 'Рефакторинг', explanation: 'Restructuring existing code without changing its external behavior.', ctx: 'I spent the afternoon refactoring the old legacy code.' },
        { front: 'Latency', back: 'Затримка', explanation: 'The delay before a transfer of data begins following an instruction.', ctx: 'High latency is causing lag in the multiplayer game.' },
        { front: 'Scalability', back: 'Масштабованість', explanation: 'The capability of a system to handle a growing amount of work.', ctx: 'Scalability is a key requirement for our cloud architecture.' },
        { front: 'Repository', back: 'Репозиторій', explanation: 'A central location where code and version history is stored.', ctx: 'Push your changes to the repository before the meeting.' },
        { front: 'API', back: 'Інтерфейс програмування', explanation: 'A set of rules allowing different software to communicate.', ctx: 'The mobile app communicates with the backend via the REST API.' },
        { front: 'Cache', back: 'Кеш', explanation: 'Temporary storage to speed up data retrieval.', ctx: 'Clear the cache if you are experiencing outdated data.' },
        { front: 'Debugging', back: 'Налагодження', explanation: 'The process of finding and fixing bugs in software.', ctx: 'He spent hours debugging the authentication issue.' },
        { front: 'Version control', back: 'Контроль версій', explanation: 'A system that tracks changes to files over time.', ctx: 'Git is the most popular version control system today.' },
      ],
    },
    {
      title: 'IELTS Advanced Verbs',
      description: 'High-level verbs to boost your IELTS speaking and writing scores.',
      likesCount: 85,
      cards: [
        { front: 'To mitigate', back: 'Пом\u2019якшити', explanation: 'To make something less severe or harmful.', ctx: 'The government took steps to mitigate the effects of the disaster.' },
        { front: 'To elucidate', back: 'Роз\u2019яснити', explanation: 'To make something clear; to explain.', ctx: 'Could you elucidate on that point further?' },
        { front: 'To exacerbate', back: 'Погіршити', explanation: 'To make a bad situation or problem worse.', ctx: 'The proposed changes will only exacerbate the current crisis.' },
        { front: 'To scrutinize', back: 'Ретельно перевірити', explanation: 'To examine or inspect closely and thoroughly.', ctx: 'Customers were warned to scrutinize the small print.' },
        { front: 'To substantiate', back: 'Обґрунтувати', explanation: 'To provide evidence to support a claim.', ctx: 'Please substantiate your argument with data.' },
        { front: 'To proliferate', back: 'Стрімко поширюватись', explanation: 'To increase rapidly in number or amount.', ctx: 'Social media platforms have proliferated over the last decade.' },
        { front: 'To alleviate', back: 'Полегшити', explanation: 'To make pain or a problem less severe.', ctx: 'The medication helped to alleviate his symptoms.' },
        { front: 'To corroborate', back: 'Підтвердити', explanation: 'To confirm or give support to a statement or idea.', ctx: 'The witness corroborated the defendant\'s alibi.' },
      ],
    },
    {
      title: 'Everyday Slang & Idioms',
      description: 'Sound like a native speaker with these everyday phrases.',
      likesCount: 240,
      cards: [
        { front: 'To bite the bullet', back: 'Стиснути зуби', explanation: 'To do something difficult you have been putting off.', ctx: 'I hate going to the dentist, but I\'ll just have to bite the bullet.' },
        { front: 'Under the weather', back: 'Хворіти / почуватись погано', explanation: 'Feeling ill or sick.', ctx: 'I\'m feeling a bit under the weather today, so I won\'t go to work.' },
        { front: 'Piece of cake', back: 'Легко, як два пальці', explanation: 'Something that is very easy to do.', ctx: 'The math test was a piece of cake.' },
        { front: 'Hit the sack', back: 'Лягти спати', explanation: 'To go to bed.', ctx: 'It\'s been a long day. I\'m going to hit the sack early.' },
        { front: 'Break a leg', back: 'Ні пуху ні пера!', explanation: 'Good luck (used especially in theatrical contexts).', ctx: 'Break a leg at your interview tomorrow!' },
        { front: 'To spill the beans', back: 'Проговоритись / видати секрет', explanation: 'To reveal secret information accidentally.', ctx: 'Don\'t spill the beans about the surprise party.' },
        { front: 'Hit the nail on the head', back: 'Потрапити в точку', explanation: 'To describe exactly what is causing a situation or problem.', ctx: 'You hit the nail on the head with that observation.' },
        { front: 'Cost an arm and a leg', back: 'Коштувати цілий статок', explanation: 'To be very expensive.', ctx: 'That new iPhone costs an arm and a leg.' },
        { front: 'Once in a blue moon', back: 'Рідко, раз на рік', explanation: 'Very rarely; not often at all.', ctx: 'He only visits his hometown once in a blue moon.' },
        { front: 'The ball is in your court', back: 'Тепер ваш хід', explanation: 'It is now your turn to take action or make a decision.', ctx: 'I\'ve made my offer. The ball is in your court.' },
      ],
    },
    {
      title: 'Business English Essentials',
      description: 'Professional vocabulary for the modern workplace.',
      likesCount: 95,
      cards: [
        { front: 'To leverage', back: 'Використовувати з вигодою', explanation: 'To use something to maximum advantage.', ctx: 'We need to leverage our existing resources.' },
        { front: 'Stakeholder', back: 'Зацікавлена сторона', explanation: 'A person with an interest or concern in something, especially a business.', ctx: 'All stakeholders were invited to the meeting.' },
        { front: 'Synergy', back: 'Синергія', explanation: 'Combined forces greater than the sum of their parts.', ctx: 'The merger created real synergy between the two teams.' },
        { front: 'Bandwidth (workload)', back: 'Час/ресурс (метафора)', explanation: 'In business, capacity or time to handle tasks.', ctx: 'I don\'t have the bandwidth for another project right now.' },
        { front: 'Deep dive', back: 'Ретельний аналіз', explanation: 'A thorough investigation of a topic.', ctx: 'Let\'s do a deep dive into the Q3 metrics.' },
        { front: 'Circle back', back: 'Повернутись до теми', explanation: 'To return to a topic later.', ctx: 'Let\'s circle back to that question after the break.' },
        { front: 'KPI', back: 'Ключовий показник ефективності', explanation: 'Key Performance Indicator \u2014 a measurable value demonstrating effectiveness.', ctx: 'Our main KPI this quarter is customer retention.' },
        { front: 'Onboarding', back: 'Адаптація нового співробітника', explanation: 'The process of integrating a new employee into an organization.', ctx: 'His onboarding period lasted two weeks.' },
      ],
    },
    {
      title: 'Travel & Tourism',
      description: 'Essential words for traveling abroad in English.',
      likesCount: 150,
      cards: [
        { front: 'Itinerary', back: 'Маршрут', explanation: 'A planned route or journey.', ctx: 'Check your itinerary before we leave.' },
        { front: 'Customs', back: 'Митниця', explanation: 'The official department that administers duties on imports.', ctx: 'We need to go through customs at the airport.' },
        { front: 'Accommodation', back: 'Житло', explanation: 'A room, building, or space where someone stays.', ctx: 'Book your accommodation in advance for the best rates.' },
        { front: 'Layover', back: 'Пересадка', explanation: 'A stop between legs of a journey.', ctx: 'We have a 3-hour layover in Istanbul.' },
        { front: 'Departure lounge', back: 'Зал відправлення', explanation: 'The area in an airport where passengers wait before boarding.', ctx: 'Please proceed to the departure lounge at Gate 14.' },
        { front: 'Jet lag', back: 'Джетлаг', explanation: 'Fatigue caused by crossing time zones rapidly.', ctx: 'I always get severe jet lag after long flights to Asia.' },
        { front: 'Hostel', back: 'Хостел', explanation: 'Cheap, shared accommodation popular among budget travelers.', ctx: 'We stayed in a hostel to save money on accommodation.' },
        { front: 'Check-in / Check-out', back: 'Заїзд / виїзд', explanation: 'Arriving and registering / leaving a hotel.', ctx: 'Check-in is at 2 PM and check-out is at 11 AM.' },
      ],
    },
    {
      title: 'Academic Vocabulary',
      description: 'Words for academic writing and university studies.',
      likesCount: 110,
      cards: [
        { front: 'Hypothesis', back: 'Гіпотеза', explanation: 'A proposed explanation for an observation.', ctx: 'We need to test this hypothesis with experiments.' },
        { front: 'Methodology', back: 'Методологія', explanation: 'A system of methods used in a particular area of study.', ctx: 'Explain your research methodology in the paper.' },
        { front: 'To synthesize', back: 'Синтезувати', explanation: 'To combine a number of things into a coherent whole.', ctx: 'Synthesize the information from these three sources.' },
        { front: 'Empirical', back: 'Емпіричний', explanation: 'Based on observation or experiment rather than theory.', ctx: 'We need empirical evidence to support this claim.' },
        { front: 'Paradigm', back: 'Парадигма', explanation: 'A typical example or pattern; a worldview.', ctx: 'This discovery shifted the scientific paradigm.' },
        { front: 'Abstract', back: 'Анотація', explanation: 'A brief summary of a research article or thesis.', ctx: 'Write a 200-word abstract for your dissertation.' },
        { front: 'Plagiarism', back: 'Плагіат', explanation: 'Taking someone else\'s work and presenting it as your own.', ctx: 'Plagiarism can result in expulsion from the university.' },
      ],
    },
    {
      title: 'Phrasal Verbs — Daily Life',
      description: 'The most common phrasal verbs used by native speakers.',
      likesCount: 200,
      cards: [
        { front: 'Give up', back: 'Здатись / кинути', explanation: 'To stop trying; to quit.', ctx: 'Don\'t give up — you\'re almost there!' },
        { front: 'Figure out', back: 'Розібратись', explanation: 'To understand or solve something.', ctx: 'I need to figure out how this works.' },
        { front: 'Run into', back: 'Несподівано зустріти', explanation: 'To meet someone by chance.', ctx: 'I ran into my old teacher at the supermarket.' },
        { front: 'Carry on', back: 'Продовжити', explanation: 'To continue doing something.', ctx: 'Please carry on with your work.' },
        { front: 'Put off', back: 'Відкласти', explanation: 'To postpone; to delay.', ctx: 'Stop putting off your homework.' },
        { front: 'Look forward to', back: 'Чекати з нетерпінням', explanation: 'To feel excited about a future event.', ctx: 'I\'m looking forward to our vacation.' },
        { front: 'Come across', back: 'Натрапити на', explanation: 'To find or encounter something by chance.', ctx: 'I came across this article and thought of you.' },
        { front: 'Turn out', back: 'Виявитись', explanation: 'To happen in a particular way or have a particular result.', ctx: 'It turned out to be a great party.' },
        { front: 'Get along with', back: 'Ладнати з кимось', explanation: 'To have a good relationship with someone.', ctx: 'Do you get along with your colleagues?' },
        { front: 'Bring up', back: 'Підняти тему / виховати', explanation: 'To mention a topic; or to raise a child.', ctx: 'She brought up an interesting point in the meeting.' },
      ],
    },
    {
      title: 'English Pronunciation — Minimal Pairs',
      description: 'Words that sound similar but mean different things.',
      likesCount: 75,
      cards: [
        { front: 'Ship vs. Sheep', back: 'Корабель vs. Вівця', explanation: '/\u026a/ short vs /i\u02d0/ long \u2014 ship has a short vowel, sheep has a long one.', ctx: 'The sheep sailed on the ship.' },
        { front: 'Bit vs. Beat', back: 'Трохи vs. Битий', explanation: 'Short /\u026a/ vs long /i\u02d0/. "Bit" is past tense of "bite", "beat" means to hit.', ctx: 'She bit the apple before the beat dropped.' },
        { front: 'Live vs. Leave', back: 'Жити vs. Йти', explanation: '/l\u026av/ to reside vs /li\u02d0v/ to depart.', ctx: 'I live here. I\'ll leave tomorrow.' },
        { front: 'Affect vs. Effect', back: 'Впливати (д) vs. Ефект (і)', explanation: 'Affect is usually a verb, Effect is usually a noun.', ctx: 'Stress can affect your health. Its effects are long-lasting.' },
        { front: 'Desert vs. Dessert', back: 'Пустеля vs. Десерт', explanation: 'Desert (one s) = dry land; Dessert (two s) = sweet course.', ctx: 'We had dessert after crossing the desert.' },
        { front: 'Loose vs. Lose', back: 'Вільний vs. Програти/втратити', explanation: 'Loose = not tight; Lose = to misplace or fail.', ctx: 'These loose jeans might make me lose them.' },
      ],
    },
  ];

  for (const deck of decks) {
    await prisma.deck.create({
      data: {
        userId: defaultUser.id,
        title: deck.title,
        description: deck.description,
        isPublic: true,
        likesCount: deck.likesCount,
        cards: {
          create: deck.cards.map(card => ({
            userId: defaultUser.id,
            front: card.front,
            back: card.back,
            englishExplanation: card.explanation,
            type: 'translation',
            contextSentence: card.ctx,
          })),
        },
      },
    });
  }
}
