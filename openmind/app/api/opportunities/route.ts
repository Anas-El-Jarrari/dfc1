import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';
import { liveOpportunities } from '@/core/opportunities';

const REGION: Record<string, number> = { 'Düsseldorf': 3, NRW: 2, Bund: 1, EU: 1 };

/** Real petitions, volunteering and participation, ranked for the signed-in person. */
export const GET = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  const personal = profile?.consentProfile !== false;
  const interests = personal ? profile?.interests ?? [] : [];
  const inDus = personal && /düsseldorf/i.test(profile?.district ?? '');
  const saved = new Set(
    (await db.select({ id: schema.saved.itemId }).from(schema.saved).where(and(eq(schema.saved.userId, user.id), eq(schema.saved.kind, 'opportunity')))).map((s) => s.id),
  );

  const items = (await liveOpportunities(new URL(req.url).searchParams.has('refresh'))).map((o) => {
    const hits = o.topics.filter((t) => interests.includes(t));
    const local = inDus && o.region === 'Düsseldorf';
    const reasons = [...(hits.length ? [`Dein Interesse: ${hits.join(', ')}`] : []), ...(local ? ['In deiner Stadt'] : [])];
    return { ...o, saved: saved.has(o.id), forYou: hits.length > 0 || local, reasons, score: hits.length * 3 + (inDus ? REGION[o.region] ?? 0 : 0) };
  });
  items.sort((a, b) => b.score - a.score);
  return NextResponse.json({ items });
});
