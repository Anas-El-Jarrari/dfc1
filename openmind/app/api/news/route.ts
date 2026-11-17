import { and, desc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';
import { refreshNewsIfStale } from '@/core/news/fetch';
import { scoreNews } from '@/core/news/rank';
import { getSource } from '@/core/sources';

/** Personal news: whitelisted sources only, ranked by the signed-in person's interests and place. */
export const GET = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  const url = new URL(req.url);
  const refresh = refreshNewsIfStale(url.searchParams.has('refresh'));
  const [count] = await db.select({ id: schema.newsItems.id }).from(schema.newsItems).limit(1);
  // The very first request waits for the feeds; later ones answer at once and refresh in the background.
  if (refresh && (!count || url.searchParams.has('refresh'))) await refresh;

  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  const usePersonal = profile?.consentProfile !== false;
  const personal = { interests: usePersonal ? profile?.interests ?? [] : [], location: usePersonal ? profile?.district ?? '' : '' };

  const rows = await db.select().from(schema.newsItems).orderBy(desc(schema.newsItems.publishedAt)).limit(200);
  const saved = new Set(
    (await db.select({ id: schema.saved.itemId }).from(schema.saved).where(and(eq(schema.saved.userId, user.id), eq(schema.saved.kind, 'news'), inArray(schema.saved.itemId, rows.map((r) => r.id).concat(''))))).map((s) => s.id),
  );

  const items = rows
    .map((r) => {
      const source = getSource(r.source);
      const { score, reasons } = scoreNews(r, personal);
      return {
        id: r.id,
        title: r.title,
        teaser: r.teaser,
        url: r.url,
        publishedAt: r.publishedAt,
        topics: r.topics,
        region: r.region,
        source: { id: r.source, name: source?.name ?? r.source, kind: source?.kind ?? 'presse', summarize: source?.summarize ?? false },
        saved: saved.has(r.id),
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);

  return NextResponse.json({ items, personalized: usePersonal });
});
