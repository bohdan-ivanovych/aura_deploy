import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// ── Library seed: 6 curated public decks ──────────────────────────────────────
const LIBRARY_PACKS = [
  {
    title: 'Essential IT Vocabulary',
    description: 'Must-know words for Software Engineers and IT professionals.',
    likesCount: 120,
    cards: [
      { front: 'Deployment', back: 'Деплой / Розгортання', englishExplanation: 'The process of moving software from a dev environment to production.' },
      { front: 'Refactoring', back: 'Рефакторинг', englishExplanation: 'Restructuring existing code without changing its external behavior.' },
      { front: 'API (Application Programming Interface)', back: 'API — інтерфейс програмування додатків', englishExplanation: 'A set of rules that lets different software talk to each other.' },
      { front: 'Repository', back: 'Репозиторій', englishExplanation: 'A storage location for source code, typically managed with Git.' },
      { front: 'Pull Request', back: 'Запит на злиття змін', englishExplanation: 'A request to merge code changes from one branch into another.' },
      { front: 'Debugging', back: 'Налагодження / Дебагінг', englishExplanation: 'The process of finding and fixing bugs in code.' },
      { front: 'Legacy Code', back: 'Застарілий код', englishExplanation: 'Old code that is difficult to maintain but still in use.' },
      { front: 'Scalability', back: 'Масштабованість', englishExplanation: "A system's ability to handle growing amounts of work." },
      { front: 'Middleware', back: 'Проміжне програмне забезпечення', englishExplanation: 'Software that connects different applications or services.' },
      { front: 'Version Control', back: 'Система контролю версій', englishExplanation: 'A system that tracks changes to files over time (e.g., Git).' },
      { front: 'CI/CD', back: 'Неперервна інтеграція / доставка', englishExplanation: 'Practices that automate building, testing, and deploying software.' },
      { front: 'Dependency', back: 'Залежність', englishExplanation: 'A library or package that your code relies on.' },
    ],
  },
  {
    title: 'IELTS Advanced Verbs',
    description: 'High-level verbs to boost your IELTS speaking and writing scores.',
    likesCount: 85,
    cards: [
      { front: 'To mitigate', back: 'Пом\'якшити / Зменшити', englishExplanation: 'To make something less severe, harmful, or painful.' },
      { front: 'To exacerbate', back: 'Погіршити / Загострити', englishExplanation: 'To make a problem, bad situation, or negative feeling worse.' },
      { front: 'To alleviate', back: 'Полегшити / Послабити', englishExplanation: 'To make pain or a problem less severe.' },
      { front: 'To scrutinize', back: 'Ретельно вивчати / Перевіряти', englishExplanation: 'To examine or inspect closely and critically.' },
      { front: 'To corroborate', back: 'Підтверджувати / Підкріплювати', englishExplanation: 'To confirm or give support to a statement or theory.' },
      { front: 'To undermine', back: 'Підривати / Послаблювати', englishExplanation: 'To weaken or damage something, especially gradually.' },
      { front: 'To facilitate', back: 'Сприяти / Полегшувати', englishExplanation: 'To make an action or process easier.' },
      { front: 'To substantiate', back: 'Обґрунтовувати / Підтверджувати', englishExplanation: 'To provide evidence to support or prove the truth of something.' },
      { front: 'To propagate', back: 'Поширювати / Розповсюджувати', englishExplanation: 'To spread or promote an idea, belief, or practice widely.' },
      { front: 'To encapsulate', back: 'Узагальнювати / Втілювати', englishExplanation: 'To express the essential features of something succinctly.' },
    ],
  },
  {
    title: 'Daily Slang & Idioms',
    description: 'Sound like a native — essential expressions for everyday conversation.',
    likesCount: 203,
    cards: [
      { front: 'Hit the nail on the head', back: 'Влучити в крапку / Точно сказати', englishExplanation: 'To describe exactly what is causing a situation or problem.' },
      { front: 'Bite the bullet', back: 'Стиснути зуби / Перетерпіти', englishExplanation: 'To endure a painful or difficult situation.' },
      { front: 'Under the weather', back: 'Погано почуватися / Хворіти', englishExplanation: 'Feeling ill or unwell.' },
      { front: 'Break the ice', back: 'Розрядити обстановку / Подолати незручність', englishExplanation: 'To do or say something to relieve tension in a social situation.' },
      { front: 'No brainer', back: 'Очевидне рішення / Само собою зрозуміло', englishExplanation: 'A decision or choice that is very easy or obvious.' },
      { front: 'Hang in there', back: 'Тримайся / Не здавайся', englishExplanation: 'To persevere in a difficult situation.' },
      { front: 'Pull someone\'s leg', back: 'Жартувати / Розіграти когось', englishExplanation: 'To joke or tease someone.' },
      { front: 'Spill the tea', back: 'Розповісти секрет / Поговорити про плітки', englishExplanation: 'To share gossip or secret information.' },
      { front: 'Ghost someone', back: 'Ігнорувати / Зникнути без пояснень', englishExplanation: 'To suddenly stop communicating with someone without explanation.' },
      { front: 'Level up', back: 'Покращитися / Перейти на новий рівень', englishExplanation: 'To improve your skills or advance to a higher level.' },
      { front: 'It\'s a vibe', back: 'Це атмосфера / Це кайф', englishExplanation: 'Used to describe something that has a great, unique atmosphere or feeling.' },
      { front: 'Low-key', back: 'Таємно / Потихеньку / Небагато', englishExplanation: 'Quiet, relaxed, or understated; or secretly doing something.' },
    ],
  },
  {
    title: 'Business English Phrases',
    description: 'Professional vocabulary for meetings, emails, and the workplace.',
    likesCount: 147,
    cards: [
      { front: 'To circle back', back: 'Повернутися до теми / Обговорити пізніше', englishExplanation: 'To return to a topic or issue at a later time.' },
      { front: 'Touch base', back: 'Зв\'язатися / Поговорити коротко', englishExplanation: 'To briefly make contact with someone to check in or update.' },
      { front: 'Synergy', back: 'Синергія / Взаємодія', englishExplanation: 'The combined effort of a group that produces a greater result than individual efforts.' },
      { front: 'Bandwidth', back: 'Час / Ресурси (розмовне)', englishExplanation: 'In business slang, the time or capacity a person has to take on work.' },
      { front: 'To action something', back: 'Виконати / Взяти до уваги та діяти', englishExplanation: 'To follow through on a task or decision.' },
      { front: 'Key performance indicator (KPI)', back: 'Ключовий показник ефективності', englishExplanation: 'A metric used to evaluate the success of an activity.' },
      { front: 'Deliverable', back: 'Результат / Продукт роботи', englishExplanation: 'A tangible outcome or result that must be completed by a deadline.' },
      { front: 'Stakeholder', back: 'Зацікавлена сторона', englishExplanation: 'A person or group with an interest or concern in a project or business.' },
      { front: 'Pain point', back: 'Проблема / Вузьке місце', englishExplanation: 'A specific problem or frustration that a customer or employee experiences.' },
      { front: 'To take something offline', back: 'Обговорити приватно / Поза зустріччю', englishExplanation: 'To discuss something outside of the current meeting or group setting.' },
    ],
  },
  {
    title: 'Phrasal Verbs Masterclass',
    description: 'Master the most common phrasal verbs used in everyday English.',
    likesCount: 96,
    cards: [
      { front: 'Give up', back: 'Здатися / Кинути', englishExplanation: 'To stop trying to do something.' },
      { front: 'Figure out', back: 'Розібратися / Зрозуміти', englishExplanation: 'To understand or find the answer to something.' },
      { front: 'Run into', back: 'Випадково зустріти / Зіткнутися з', englishExplanation: 'To meet someone unexpectedly, or to encounter a problem.' },
      { front: 'Bring up', back: 'Згадати / Порушити тему', englishExplanation: 'To mention a topic in a conversation.' },
      { front: 'Look into', back: 'Розслідувати / Досліджувати', englishExplanation: 'To investigate or research something.' },
      { front: 'Come across', back: 'Натрапити / Справляти враження', englishExplanation: 'To find something by chance, or to seem a certain way to others.' },
      { front: 'Get along (with)', back: 'Ладнати / Мати добрі стосунки', englishExplanation: 'To have a friendly relationship with someone.' },
      { front: 'Put off', back: 'Відкладати / Відтягувати', englishExplanation: 'To postpone something to a later time.' },
      { front: 'Turn down', back: 'Відмовити / Зменшити гучність', englishExplanation: 'To reject an offer or request; also to reduce volume/heat.' },
      { front: 'Go through', back: 'Пережити / Перевірити', englishExplanation: 'To experience a difficult time, or to examine something carefully.' },
      { front: 'Show up', back: 'З\'явитися / Прийти', englishExplanation: 'To arrive or be present at a place or event.' },
      { front: 'Call off', back: 'Скасувати', englishExplanation: 'To cancel an event or activity.' },
    ],
  },
  {
    title: 'Academic Word List',
    description: 'Core vocabulary for academic reading, writing, and presentations.',
    likesCount: 78,
    cards: [
      { front: 'Analyze', back: 'Аналізувати', englishExplanation: 'To examine something methodically and in detail.' },
      { front: 'Hypothesis', back: 'Гіпотеза', englishExplanation: 'A proposed explanation for an observation, to be tested.' },
      { front: 'Significant', back: 'Значний / Суттєвий', englishExplanation: 'Sufficiently great or important to be worthy of attention.' },
      { front: 'Methodology', back: 'Методологія', englishExplanation: 'A system of methods used in a particular field of study.' },
      { front: 'Implication', back: 'Наслідок / Підтекст', englishExplanation: 'A conclusion that can be drawn from something, though not explicit.' },
      { front: 'Empirical', back: 'Емпіричний', englishExplanation: 'Based on observation and evidence rather than theory.' },
      { front: 'Paradigm', back: 'Парадигма', englishExplanation: 'A typical example or pattern of something; a model or framework.' },
      { front: 'Synthesis', back: 'Синтез', englishExplanation: 'The combination of ideas to form a new theory or explanation.' },
      { front: 'Variable', back: 'Змінна', englishExplanation: 'An element that can be changed or controlled in an experiment.' },
      { front: 'Critique', back: 'Критика / Рецензія', englishExplanation: 'A detailed analysis and assessment of something.' },
    ],
  },
];

export async function GET() {
  try {
    // Idempotent: delete existing public decks and re-seed
    await prisma.deck.deleteMany({ where: { isPublic: true } });

    // Use the first user as deck owner (library packs are public, owner is system)
    const systemUser = await prisma.user.findFirst();
    if (!systemUser) {
      return NextResponse.json({ error: 'No user found — run the app first to create a user.' }, { status: 400 });
    }

    const created = await Promise.all(
      LIBRARY_PACKS.map(pack =>
        prisma.deck.create({
          data: {
            userId: systemUser.id,
            title: pack.title,
            description: pack.description,
            isPublic: true,
            likesCount: pack.likesCount,
            cards: {
              create: pack.cards.map(c => ({
                userId: systemUser.id,
                front: c.front,
                back: c.back,
                englishExplanation: c.englishExplanation,
                type: 'translation',
              })),
            },
          },
          include: { _count: { select: { cards: true } } },
        })
      )
    );

    return NextResponse.json({
      success: true,
      seeded: created.length,
      decks: created.map(d => ({ id: d.id, title: d.title, cards: d._count.cards })),
    });
  } catch (error: any) {
    console.error('[seed-decks] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
