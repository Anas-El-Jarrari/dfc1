import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import { agentRuns } from '@/core/db/schema';
import { HttpError, safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
import { rateLimit } from '@/core/http/rateLimit';
import { loadApplication } from '@/core/research/drafts';
import { runApplication } from '@/core/research/pipeline';
const running = new Set<string>();
export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  const { draftId, refresh } = z.object({ draftId: z.string(), refresh: z.boolean().default(false) }).parse(await req.json());
  const app = await loadApplication(user.id, draftId);
  if (app.draft.status !== 'offen') throw new HttpError(409, 'Dieses Schreiben wurde bereits versendet.');
  const key = user.id + ':' + draftId;
  if (running.has(key)) throw new HttpError(409, 'Die Recherche für diesen Entwurf läuft bereits.');
  const [cached] = !refresh ? await db.select().from(agentRuns).where(and(eq(agentRuns.userId, user.id), eq(agentRuns.draftId, draftId), eq(agentRuns.fingerprint, app.fingerprint))).orderBy(desc(agentRuns.createdAt)).limit(1) : [];
  rateLimit('application:' + user.id, 12, 10 * 60_000);
  running.add(key);
  const abort = new AbortController();
  const signal = AbortSignal.any([abort.signal, req.signal]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: unknown) => { if (!signal.aborted) controller.enqueue(encoder.encode('data: ' + JSON.stringify(event) + '\n\n')); };
      try {
        if (cached && Date.now() - Date.parse(cached.createdAt + (cached.createdAt.includes('Z') ? '' : 'Z')) < 60 * 60_000) {
          emit({ type: 'complete', runId: cached.id, result: cached.result, cached: true });
        } else {
          const result = await runApplication(app.input, emit, signal);
          if (!signal.aborted) {
            const [run] = await db.insert(agentRuns).values({ userId: user.id, draftId, fingerprint: app.fingerprint, result }).returning();
            emit({ type: 'complete', runId: run.id, result, cached: false });
          }
        }
      } catch (error) {
        if (!signal.aborted) emit({ type: 'error', error: error instanceof Error ? error.message : 'Recherche fehlgeschlagen.' });
      } finally { running.delete(key); if (!signal.aborted) controller.close(); }
    },
    cancel() { abort.abort(); running.delete(key); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
});

