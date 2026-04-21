import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ error: "No user found" }, { status: 400 });
    }

    const existingDecks = await prisma.deck.findMany({ where: { isPublic: true } });
    if (existingDecks.length > 0) {
      await prisma.deck.deleteMany({ where: { isPublic: true } });
    }

    // Set 1: IT Vocabulary
    await prisma.deck.create({
      data: {
        userId: defaultUser.id,
        title: "Essential IT Vocabulary",
        description: "Must-know words for Software Engineers and IT professionals.",
        isPublic: true,
        likesCount: 120,
        cards: {
          create: [
            { userId: defaultUser.id, front: "Deployment", back: "Deployment", englishExplanation: "The process of moving software from a development environment to a production environment.", type: "translation" }
          ]
        }
      }
    });

    // Set 2: IELTS Advanced
    await prisma.deck.create({
      data: {
        userId: defaultUser.id,
        title: "IELTS Advanced Verbs",
        description: "High-level verbs to boost your IELTS speaking and writing scores.",
        isPublic: true,
        likesCount: 85,
        cards: {
          create: [
            { userId: defaultUser.id, front: "To mitigate", back: "To mitigate", englishExplanation: "To make something less severe, harmful, or painful.", type: "translation" }
          ]
        }
      }
    });

    return NextResponse.json({ success: true, message: "Seeded" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
