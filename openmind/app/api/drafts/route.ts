import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as s from '@/core/db/schema';
import { HttpError, safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
import { applicationFingerprint, applicationInput, draftContent } from '@/core/research/drafts';
const save = z.object({
  id: z.string().optional(), type: z.enum(['antrag', 'stellungnahme', 'petition', 'anregung']),
  title: z.string().max(200).default(''), ownText: z.string().max(4000).default(''), step: z.number().int().min(0).max(20).default(0), content: draftContent,
});
export const GET = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  const rows = await db.select().from(s.drafts).where(and(eq(s.drafts.userId, user.id), eq(s.drafts.status, 'offen'))).orderBy(desc(s.drafts.updatedAt)).limit(20);
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.userId, user.id));
  const [account] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  const hydrated = await Promise.all(rows.map(async (row) => {
    const content = draftContent.parse(row.content);
    const runId = content.agentRunId;
    const [run] = runId ? await db.select().from(s.agentRuns).where(and(eq(s.agentRuns.id, runId), eq(s.agentRuns.userId, user.id), eq(s.agentRuns.draftId, row.id))) : [];
    const [delivery] = await db.select({ state: s.mailDeliveries.state }).from(s.mailDeliveries).where(eq(s.mailDeliveries.draftId, row.id));
    const current = Boolean(run && profile && account && run.fingerprint === applicationFingerprint(applicationInput(row, profile, account.name)));
    return {
      ...row,
      content: current ? { ...content, analysis: run!.result } : {
        ...content, analysis: undefined, agentRunId: undefined, recipientEmail: '', recipientSourceUrl: '',
        subject: '', body: '', segments: [], ai: false, aiShare: 0,
      },
      deliveryState: delivery?.state,
    };
  }));
  return NextResponse.json({ drafts: hydrated });
});
export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  const d = save.parse(await req.json());
  const values = { type: d.type, title: d.title, ownText: d.ownText, step: d.step, content: d.content, updatedAt: new Date().toISOString() };
  const row = await db.transaction(async (tx) => {
    if (d.id) {
      const [delivery] = await tx.select().from(s.mailDeliveries).where(and(eq(s.mailDeliveries.draftId, d.id), eq(s.mailDeliveries.userId, user.id)));
      if (delivery && delivery.state !== 'failed') throw new HttpError(409, 'Der Versand wurde bereits gestartet. Dieser Entwurf ist gesperrt; prüfe den Status unter Wirkung.');
      const [row] = await tx.update(s.drafts).set(values).where(and(eq(s.drafts.id, d.id), eq(s.drafts.userId, user.id), eq(s.drafts.status, 'offen'))).returning();
      if (!row) throw new HttpError(404, 'Diesen offenen Entwurf gibt es nicht mehr.');
      return row;
    }
    return (await tx.insert(s.drafts).values({ ...values, userId: user.id }).returning())[0];
  });
  return NextResponse.json({ draft: row });
});
export const DELETE = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  const id = new URL(req.url).searchParams.get('id') || '';
  await db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(s.mailDeliveries).where(and(eq(s.mailDeliveries.draftId, id), eq(s.mailDeliveries.userId, user.id)));
    if (delivery && delivery.state !== 'failed') throw new HttpError(409, 'Ein gestarteter Versand darf nicht gelöscht werden.');
    await tx.delete(s.drafts).where(and(eq(s.drafts.id, id), eq(s.drafts.userId, user.id)));
  });
  return NextResponse.json({ ok: true });
});

