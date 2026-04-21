import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/user';



// Re-export user lookup so API routes can use a single import
export const getOrCreateUser = getCurrentUser;

export function handleApiError(error: unknown, context: string): { error: string; status: number } {
  console.error(`${context}:`, error);
  if (error instanceof Error) {
    return { error: error.message, status: 500 };
  }
  return { error: 'An unexpected error occurred', status: 500 };
}

export function createSuccessResponse<T>(data: T) {
  return NextResponse.json(data);
}

export function createErrorResponse(error: string, status: number = 500) {
  return NextResponse.json({ error }, { status });
}
