import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';

const input = z.object({ kind: z.enum(['news', 'opportunity']), itemId: z.string().min(1).max(64), saved: z.boolean() });

/** Remember or forget a news item or an opportunity for the signed-in person. */
export const POST = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  const { kind, itemId, saved } = input.parse(await req.json());
  const where = and(eq(schema.saved.userId, user.id), eq(schema.saved.kind, kind), eq(schema.saved.itemId, itemId));
  if (saved) await db.insert(schema.saved).values({ userId: user.id, kind, itemId }).onConflictDoNothing();
  else await db.delete(schema.saved).where(where);
  return NextResponse.json({ saved });
});
