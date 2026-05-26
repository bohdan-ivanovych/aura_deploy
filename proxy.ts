import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge proxy runs before every request.
 *
 * Responsibility: ensure every visitor has a `user-id` cookie set.
 * Doing this here is the only safe place to write a cookie that Server
 * Components can then read on the first request.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get('user-id')?.value) {
    return NextResponse.next();
  }

  const userId = crypto.randomUUID();
  const oneYear = 60 * 60 * 24 * 365;

  const requestHeaders = new Headers(request.headers);
  const existingCookie = requestHeaders.get('cookie') || '';
  const newCookie = existingCookie
    ? `${existingCookie}; user-id=${userId}`
    : `user-id=${userId}`;
  requestHeaders.set('cookie', newCookie);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)',
  ],
};
