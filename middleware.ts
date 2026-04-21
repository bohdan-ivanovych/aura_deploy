import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Middleware — runs before every request.
 *
 * Responsibility: ensure every visitor has a `user-id` cookie set.
 * Doing this here (Edge) is the only safe place to *write* a cookie
 * that Server Components can then *read* — Server Components themselves
 * cannot write cookies (Next.js restriction).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // If user already has an ID cookie, do nothing.
  if (request.cookies.get('user-id')?.value) {
    return response;
  }

  // Generate a new persistent anonymous user ID.
  const userId = crypto.randomUUID();
  const oneYear = 60 * 60 * 24 * 365;

  response.cookies.set('user-id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: oneYear,
    path: '/',
  });

  return response;
}

export const config = {
  // Run on all routes except static assets, _next internals, and favicons.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)',
  ],
};
