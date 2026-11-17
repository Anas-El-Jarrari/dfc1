import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import { gmailAccounts } from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  await db.delete(gmailAccounts).where(eq(gmailAccounts.userId, user.id));
  return NextResponse.json({ ok: true });
});

