import { NextResponse } from 'next/server';
import { SESSION_COOKIE, cookieOptions, verifyLogin } from '@/core/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = await verifyLogin(url.searchParams.get('token') ?? '').catch(() => undefined);
  if (!session) return NextResponse.redirect(new URL('/anmelden?fehler=link', url));
  const res = NextResponse.redirect(new URL('/', url));
  res.cookies.set(SESSION_COOKIE, session, cookieOptions);
  return res;
}
