import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { HttpError } from '@/core/http/safeRoute';
import { resolveApplicationInput, unansweredQuestions } from './intent';
import { intakeSchema, type ApplicationInput } from './types';
export const draftContent = z.object({
  procedureId: z.string(), topicId: z.string().optional(),
  answers: z.record(z.string().max(40), z.string().max(500)).default({}),
  intent: intakeSchema.optional(), intentModel: z.string().max(120).optional(),
  autoAnswers: z.record(z.string().max(40), z.string().max(500)).default({}),
  subject: z.string().max(200).default(''), body: z.string().max(24000).default(''),
  segments: z.array(z.object({ text: z.string().max(24000), ai: z.boolean() })).max(4000).optional(),
  ai: z.boolean().optional(), aiShare: z.number().min(0).max(100).default(0), counter: z.string().max(1000).optional(),
  agentRunId: z.string().optional(), recipientEmail: z.string().max(254).default(''), recipientSourceUrl: z.string().max(2000).default(''),
});
export type DraftContent = z.infer<typeof draftContent>;
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// The workflow version is part of every cache/send fingerprint. Bump it whenever
// interpretation, evidence selection, or the final-draft safety checks change.
export const applicationFingerprint = (input: ApplicationInput) => digest({ workflow: 'user-intent-v6', input });
export function applicationInput(draft: typeof schema.drafts.$inferSelect, profile: typeof schema.profiles.$inferSelect, name: string | null): ApplicationInput {
  const c = draftContent.parse(draft.content);
  const answers = Object.fromEntries(Object.entries(c.answers).sort(([a], [b]) => a.localeCompare(b)));
  return resolveApplicationInput({
    title: draft.title, ownText: draft.ownText, answers, procedureId: c.procedureId, topicId: c.topicId,
    counter: c.counter, name: name || '', profileLocation: profile.district?.trim() || '',
    location: profile.district?.trim() || '', postalCode: profile.postalCode || '', intent: c.intent, intentModel: c.intentModel,
  });
}
export async function loadApplication(userId: string, draftId: string) {
  const [draft] = await db.select().from(schema.drafts).where(and(eq(schema.drafts.id, draftId), eq(schema.drafts.userId, userId)));
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!draft || !profile || !user) throw new HttpError(404, 'Entwurf nicht gefunden.');
  const input = applicationInput(draft, profile, user.name);
  if (!input.location) throw new HttpError(400, 'Ergänze bitte deinen Ort im Profil.');
  if (input.ownText.trim().length < 10) throw new HttpError(400, 'Beschreibe das Anliegen zuerst in eigenen Worten.');
  const unanswered = unansweredQuestions(input.intent, input.answers);
  if (unanswered.length) throw new HttpError(400, 'Bitte kläre noch: ' + unanswered.map((item) => item.question).join(' '));
  return { draft, input, fingerprint: applicationFingerprint(input), content: draftContent.parse(draft.content) };
}

