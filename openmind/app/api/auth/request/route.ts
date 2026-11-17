import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestLogin } from '@/core/auth';
import { rateLimit } from '@/core/http/rateLimit';
import { safeRoute } from '@/core/http/safeRoute';

const input = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });

export const POST = safeRoute(async (req: Request) => {
  const { email } = input.parse(await req.json());
  // Protects inboxes from being flooded with sign-in mails through this form.
  // Locally the test suite signs in dozens of times, so the limit only bites in production.
  rateLimit(`login-ip:${req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'}`, process.env.NODE_ENV === 'production' ? 30 : 10_000, 10 * 60_000);
  return NextResponse.json({ ok: true, ...(await requestLogin(email, new URL(req.url).origin)) });
});
