import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST() {
  try {
    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    // Delete existing public decks to recreate them
    await prisma.deck.deleteMany({ where: { isPublic: true } });

    // Set 1: Essential IT Vocabulary
    await prisma.deck.create({
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
    await prisma.deck.create({
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
    await prisma.deck.create({
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

    // Set 4: Business English
    await prisma.deck.create({
      data: {
        userId: defaultUser.id,
        title: "Business English Essentials",
        description: "Professional vocabulary for the workplace.",
        isPublic: true,
        likesCount: 95,
        cards: {
          create: [
            {
              userId: defaultUser.id,
              front: "To leverage",
              back: "To leverage",
              englishExplanation: "To use something to maximum advantage.",
              type: "translation",
              contextSentence: "We need to leverage our existing resources.",
            },
            {
              userId: defaultUser.id,
              front: "Stakeholder",
              back: "Stakeholder",
              englishExplanation: "A person with an interest or concern in something, especially a business.",
              type: "translation",
              contextSentence: "All stakeholders were invited to the meeting.",
            },
            {
              userId: defaultUser.id,
              front: "Scalable",
              back: "Scalable",
              englishExplanation: "Capable of being expanded or easily adapted.",
              type: "translation",
              contextSentence: "This solution is highly scalable.",
            }
          ]
        }
      }
    });

    // Set 5: Travel & Tourism
    await prisma.deck.create({
      data: {
        userId: defaultUser.id,
        title: "Travel & Tourism",
        description: "Essential words for traveling abroad.",
        isPublic: true,
        likesCount: 150,
        cards: {
          create: [
            {
              userId: defaultUser.id,
              front: "Itinerary",
              back: "Itinerary",
              englishExplanation: "A planned route or journey.",
              type: "translation",
              contextSentence: "Check your itinerary before we leave.",
            },
            {
              userId: defaultUser.id,
              front: "Customs",
              back: "Customs",
              englishExplanation: "The official department that administers and collects duties on imports.",
              type: "translation",
              contextSentence: "We need to go through customs.",
            },
            {
              userId: defaultUser.id,
              front: "Accommodation",
              back: "Accommodation",
              englishExplanation: "A room, group of rooms, or building in which someone may live or stay.",
              type: "translation",
              contextSentence: "Book your accommodation in advance.",
            }
          ]
        }
      }
    });

    // Set 6: Academic Vocabulary
    await prisma.deck.create({
      data: {
        userId: defaultUser.id,
        title: "Academic Vocabulary",
        description: "Words for academic writing and university studies.",
        isPublic: true,
        likesCount: 110,
        cards: {
          create: [
            {
              userId: defaultUser.id,
              front: "Hypothesis",
              back: "Hypothesis",
              englishExplanation: "A proposed explanation or theory.",
              type: "translation",
              contextSentence: "We need to test this hypothesis.",
            },
            {
              userId: defaultUser.id,
              front: "Methodology",
              back: "Methodology",
              englishExplanation: "A system of methods used in a particular area of study.",
              type: "translation",
              contextSentence: "Explain your methodology in the paper.",
            },
            {
              userId: defaultUser.id,
              front: "To synthesize",
              back: "To synthesize",
              englishExplanation: "To combine a number of things into a coherent whole.",
              type: "translation",
              contextSentence: "Synthesize the information from these sources.",
            }
          ]
        }
      }
    });

    return NextResponse.json({ message: 'Public decks created successfully' });
  } catch (error) {
    console.error('Error seeding public decks:', error);
    return NextResponse.json({ error: 'Failed to seed decks' }, { status: 500 });
  }
}
