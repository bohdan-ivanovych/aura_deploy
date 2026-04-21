import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    if (!name && !description) {
      return NextResponse.json({ error: 'Name or description required' }, { status: 400 });
    }

    // Simple gender detection based on common patterns
    const text = `${name} ${description}`.toLowerCase();
    
    let gender = 'neutral';
    let confidence = 0.5;

    // Male indicators
    const maleIndicators = [
      'he', 'him', 'his', 'mr', 'sir', 'man', 'men', 'male', 'boy', 'guy', 'gentleman',
      'father', 'brother', 'son', 'uncle', 'king', 'prince', 'hero', 'warrior'
    ];
    
    // Female indicators  
    const femaleIndicators = [
      'she', 'her', 'hers', 'mrs', 'miss', 'ms', 'woman', 'women', 'female', 'girl', 'lady',
      'mother', 'sister', 'daughter', 'aunt', 'queen', 'princess', 'heroine', 'goddess'
    ];

    const maleCount = maleIndicators.filter(indicator => text.includes(indicator)).length;
    const femaleCount = femaleIndicators.filter(indicator => text.includes(indicator)).length;

    if (maleCount > femaleCount) {
      gender = 'male';
      confidence = Math.min(0.9, 0.5 + (maleCount - femaleCount) * 0.1);
    } else if (femaleCount > maleCount) {
      gender = 'female';
      confidence = Math.min(0.9, 0.5 + (femaleCount - maleCount) * 0.1);
    }

    // Check for common gendered names
    const maleNames = ['john', 'michael', 'david', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles'];
    const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen'];
    
    const nameLower = name.toLowerCase();
    if (maleNames.some(maleName => nameLower.includes(maleName))) {
      gender = 'male';
      confidence = 0.8;
    } else if (femaleNames.some(femaleName => nameLower.includes(femaleName))) {
      gender = 'female';
      confidence = 0.8;
    }

    return NextResponse.json({
      gender,
      confidence,
      voiceSettings: {
        male: {
          pitch: 0.8,
          rate: 0.9,
          volume: 1.0
        },
        female: {
          pitch: 1.2,
          rate: 0.95,
          volume: 0.9
        },
        neutral: {
          pitch: 1.0,
          rate: 0.9,
          volume: 1.0
        }
      }
    });

  } catch (error) {
    console.error('Gender detection error:', error);
    return NextResponse.json({ error: 'Failed to detect gender' }, { status: 500 });
  }
}
