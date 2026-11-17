import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as s from '@/core/db/schema';
import { HttpError, safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
import { rateLimit } from '@/core/http/rateLimit';
import { draftContent } from '@/core/research/drafts';
import { extractIntent } from '@/core/research/intent';

export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  rateLimit('intake:' + user.id, 20, 10 * 60_000);
  const { draftId } = z.object({ draftId: z.string() }).parse(await req.json());
  const [draft] = await db.select().from(s.drafts).where(and(eq(s.drafts.id, draftId), eq(s.drafts.userId, user.id)));
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.userId, user.id));
  if (!draft || !profile) throw new HttpError(404, 'Entwurf oder Profil nicht gefunden.');
  if (draft.status !== 'offen') throw new HttpError(409, 'Dieses Schreiben wurde bereits versendet.');
  if (draft.ownText.trim().length < 10) throw new HttpError(400, 'Beschreibe kurz das Problem oder was du verändern möchtest.');
  const content = draftContent.parse(draft.content);
  const parsed = await extractIntent({
    originalText: draft.ownText,
    title: draft.title,
    profileLocation: profile.district?.trim() || '',
    postalCode: profile.postalCode || '',
    topicTitle: content.topicId ? draft.title : undefined,
  }, req.signal);
  return Response.json(parsed);
});
