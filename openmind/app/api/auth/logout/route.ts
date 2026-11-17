import { NextResponse } from 'next/server';
import { SESSION_COOKIE, endSession } from '@/core/auth';
import { safeRoute } from '@/core/http/safeRoute';

export const POST = safeRoute(async (req: Request) => {
  await endSession(req);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
