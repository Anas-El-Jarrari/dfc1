import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import { submissions } from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
import { submitReview } from '@/core/gmail/service';
export const GET = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  return NextResponse.json({ submissions: await db.select().from(submissions).where(eq(submissions.userId, user.id)).orderBy(desc(submissions.sentAt)).limit(50) });
});
export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  const input = z.object({ reviewId: z.string().min(1), confirmed: z.literal(true) }).parse(await req.json());
  return NextResponse.json(await submitReview(user.id, input.reviewId));
});

