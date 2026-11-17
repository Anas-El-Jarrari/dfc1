import { z } from 'zod';
export interface Source { id: number; title: string; url: string; snippet: string; text?: string; emails?: string[]; emailEvidence?: string[]; links?: string[]; checkedAt: string }
const strings = z.array(z.string().max(500)).max(20).default([]);
const ids = z.array(z.number().int()).max(8).default([]);
export const intakeQuestionSchema = z.object({
  field: z.enum(['ort', 'betroffen', 'ziel']),
  question: z.string().min(4).max(220),
  reason: z.string().max(300).default(''),
});
/** Structured user intent. It is kept separate from facts found on the web. */
export const intakeSchema = z.object({
  summary: z.string().min(3).max(500),
  issue: z.string().min(3).max(400),
  goal: z.string().max(400).default(''),
  explicitLocation: z.string().max(160).default(''),
  affected: z.string().max(240).default(''),
  confirmedDetails: z.array(z.string().min(1).max(300)).max(12).default([]),
  needsExactLocation: z.boolean().default(false),
  openQuestions: z.array(intakeQuestionSchema).max(5).default([]),
  searchTerms: z.array(z.string().max(120)).max(3).default([]),
});
export const researchSchema = z.object({ summary: z.string().max(800), findings: z.array(z.object({ claim: z.string().max(600), sourceIds: ids })).max(8), unknowns: strings, searchTerms: z.array(z.string().max(120)).max(3).default([]) });
export const routingSchema = z.object({
  office: z.object({ name: z.string().max(160), reason: z.string().max(500), sourceIds: ids }),
  recommendation: z.string().max(600), recommendationSourceIds: ids, method: z.enum(['email', 'form', 'unknown']),
  contacts: z.array(z.object({ kind: z.enum(['email', 'form', 'phone']), value: z.string().max(300), sourceId: z.number().int(), purpose: z.string().max(180) })).max(10),
  unverifiedContacts: z.array(z.object({ value: z.string().max(300), sourceId: z.number().int(), purpose: z.string().max(180) })).max(10).default([]),
  options: z.array(z.object({ title: z.string().max(160), description: z.string().max(500), tradeoff: z.string().max(300), sourceIds: ids })).max(5),
  laws: z.array(z.object({ citation: z.string().max(180), relevance: z.string().max(500), limit: z.string().max(300), sourceIds: ids })).max(6),
  requirements: z.array(z.object({ title: z.string().max(160), detail: z.string().max(500), required: z.boolean(), sourceIds: ids })).max(8),
  verificationNeeded: strings,
});
export const draftSchema = z.object({ subject: z.string().min(3).max(200), body: z.string().min(40).max(9000), counterposition: z.string().max(1200) });
export const guardianSchema = z.object({
  pass: z.boolean(), concerns: strings, unsupportedClaims: strings,
  counterposition: z.string(), missingDraftElements: strings,
  quality: z.object({
    repetitive: z.boolean().default(false),
    quotedOriginal: z.boolean().default(false),
    fieldLabels: z.boolean().default(false),
    unnaturalFormulation: z.boolean().default(false),
  }).default({ repetitive: false, quotedOriginal: false, fieldLabels: false, unnaturalFormulation: false }),
  alignment: z.object({
    addressesProblem: z.boolean().default(false),
    includesDesiredChange: z.boolean().default(false),
    preservesUserPosition: z.boolean().default(false),
    inventedUserDetails: strings,
  }).default({ addressesProblem: false, includesDesiredChange: false, preservesUserPosition: false, inventedUserDetails: [] }),
});
export const participationReviewSchema = z.object({
  findingIndexes: z.array(z.number().int().min(0).max(40)).max(12).default([]),
  optionIndexes: z.array(z.number().int().min(0).max(40)).max(8).default([]),
  lawIndexes: z.array(z.number().int().min(0).max(40)).max(8).default([]),
  requirementIndexes: z.array(z.number().int().min(0).max(40)).max(10).default([]),
  sourceIds: z.array(z.number().int().positive().max(1000)).max(16).default([]),
});
export type UserIntent = z.infer<typeof intakeSchema>;
export interface ApplicationInput {
  title: string; ownText: string; answers: Record<string, string>; procedureId: string; topicId?: string; counter?: string; name: string;
  /** Location copied from the user's profile, before any explicit place override. */
  profileLocation?: string; location: string; locationSource?: 'profile' | 'user'; postalCode: string;
  intent?: UserIntent; intentModel?: string;
}
export type StageId = 'intake' | 'research' | 'routing' | 'draft' | 'guardian' | 'relevance';
export interface StageEvent { type: 'stage'; id: StageId; name: string; status: 'working' | 'done'; model: string }
export interface ApplicationResult {
  location: string; model: string; sources: Source[]; checkedAt: string;
  intake: z.infer<typeof intakeSchema>; research: z.infer<typeof researchSchema>;
  routing: z.infer<typeof routingSchema>; draft: z.infer<typeof draftSchema>;
  guardian: z.infer<typeof guardianSchema>; participationReview: z.infer<typeof participationReviewSchema>; participationReviewModel: string;
}

