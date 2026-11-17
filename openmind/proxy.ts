import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/', '/anmelden', '/datenschutz', '/status', '/ui'];

/**
 * Sends visitors without a session cookie to the sign-in page.
 * This is only the fast first gate; whether the session is valid is checked by every API route (requireUser).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname) || req.cookies.has('om_session')) return NextResponse.next();
  return NextResponse.redirect(new URL('/anmelden', req.url));
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|manifest.json|robots.txt|.*\\.(?:svg|png|ico|txt)$).*)'] };
