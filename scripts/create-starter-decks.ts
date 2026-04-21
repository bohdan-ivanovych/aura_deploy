import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.error("No default user found");
    return;
  }

  const existingDecks = await prisma.deck.findMany({ where: { isPublic: true } });
  if (existingDecks.length > 0) {
    console.log("Community decks already exist. Deleting existing public decks for fresh seed...");
    // delete all public decks to recreate them based on prompt requirements
    await prisma.deck.deleteMany({ where: { isPublic: true } });
  }

  // Set 1: Essential IT Vocabulary
  const deck1 = await prisma.deck.create({
    data: {
      userId: defaultUser.id,
      title: "Essential IT Vocabulary",
      description: "Must-know words for Software Engineers and IT professionals.",
      isPublic: true,
      likesCount: 120,
      cards: {
        create: [
          {
            userId: defaultUser.id,
            front: "Deployment",
            back: "Deployment",
            englishExplanation: "The process of moving software from a development environment to a production environment.",
            type: "translation",
            contextSentence: "The deployment to the production server was successful.",
          },
          {
            userId: defaultUser.id,
            front: "Bandwidth",
            back: "Bandwidth",
            englishExplanation: "The maximum rate of data transfer across a given path.",
            type: "translation",
            contextSentence: "We need more bandwidth to handle the increased traffic.",
          },
          {
            userId: defaultUser.id,
            front: "Refactoring",
            back: "Refactoring",
            englishExplanation: "The process of restructuring existing computer code without changing its external behavior.",
            type: "translation",
            contextSentence: "I spent the afternoon refactoring the old legacy code.",
          },
          {
            userId: defaultUser.id,
            front: "Latency",
            back: "Latency",
            englishExplanation: "The delay before a transfer of data begins following an instruction.",
            type: "translation",
            contextSentence: "High latency is causing lag in the multiplayer game.",
          },
          {
            userId: defaultUser.id,
            front: "Scalability",
            back: "Scalability",
            englishExplanation: "The capability of a system to handle a growing amount of work.",
            type: "translation",
            contextSentence: "Scalability is a key requirement for our cloud architecture.",
          }
        ]
      }
    }
  });

  // Set 2: IELTS Advanced Verbs
  const deck2 = await prisma.deck.create({
    data: {
      userId: defaultUser.id,
      title: "IELTS Advanced Verbs",
      description: "High-level verbs to boost your IELTS speaking and writing scores.",
      isPublic: true,
      likesCount: 85,
      cards: {
        create: [
          {
            userId: defaultUser.id,
            front: "To mitigate",
            back: "To mitigate",
            englishExplanation: "To make something less severe, harmful, or painful.",
            type: "translation",
            contextSentence: "The government took steps to mitigate the effects of the disaster.",
          },
          {
            userId: defaultUser.id,
            front: "To elucidate",
            back: "To elucidate",
            englishExplanation: "To make something clear; to explain.",
            type: "translation",
            contextSentence: "Could you elucidate on that point further?",
          },
          {
            userId: defaultUser.id,
            front: "To exacerbate",
            back: "To exacerbate",
            englishExplanation: "To make a bad situation, a problem, or a negative feeling worse.",
            type: "translation",
            contextSentence: "The proposed changes will only exacerbate the current crisis.",
          },
          {
            userId: defaultUser.id,
            front: "To scrutinize",
            back: "To scrutinize",
            englishExplanation: "To examine or inspect closely and thoroughly.",
            type: "translation",
            contextSentence: "Customers were warned to scrutinize the small print.",
          }
        ]
      }
    }
  });

  // Set 3: Slang and Idioms
  const deck3 = await prisma.deck.create({
    data: {
      userId: defaultUser.id,
      title: "Everyday Slang & Idioms",
      description: "Sound like a native speaker with these everyday phrases.",
      isPublic: true,
      likesCount: 240,
      cards: {
        create: [
          {
            userId: defaultUser.id,
            front: "To bite the bullet",
            back: "To bite the bullet",
            englishExplanation: "To decide to do something difficult or unpleasant that one has been putting off.",
            type: "translation",
            contextSentence: "I hate going to the dentist, but I'll just have to bite the bullet.",
          },
          {
            userId: defaultUser.id,
            front: "Under the weather",
            back: "Under the weather",
            englishExplanation: "Feeling ill or sick.",
            type: "translation",
            contextSentence: "I'm feeling a bit under the weather today, so I won't go to work.",
          },
          {
            userId: defaultUser.id,
            front: "Piece of cake",
            back: "Piece of cake",
            englishExplanation: "Something that is very easy to do.",
            type: "translation",
            contextSentence: "The math test was a piece of cake.",
          }
        ]
      }
    }
  });

  console.log("Starter decks created successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
