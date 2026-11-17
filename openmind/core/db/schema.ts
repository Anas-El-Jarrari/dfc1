import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`);
const userId = () => text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' });
const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: createdAt(),
});

/** One-time sign-in links. Only the hash is stored, so a database leak reveals no usable link. */
export const loginTokens = sqliteTable('login_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  email: text('email').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: userId(),
  expiresAt: integer('expires_at').notNull(),
});

export const profiles = sqliteTable('profiles', {
  userId: userId().primaryKey(),
  district: text('district'),
  postalCode: text('postal_code'),
  interests: json<string[]>('interests').notNull().default([]),
  values: json<string[]>('values').notNull().default([]),
  easyLanguage: integer('easy_language', { mode: 'boolean' }).notNull().default(false),
  kimDisabled: integer('kim_disabled', { mode: 'boolean' }).notNull().default(false),
  consentProfile: integer('consent_profile', { mode: 'boolean' }).notNull().default(true),
  onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
  tutorialDone: integer('tutorial_done', { mode: 'boolean' }).notNull().default(false),
});

export const settings = sqliteTable('settings', {
  userId: userId().primaryKey(),
  /** Legacy personal contact preference. Submissions use the connected Gmail identity. */
  ownEmail: text('own_email'),
});

export const drafts = sqliteTable('drafts', {
  id: id(),
  userId: userId(),
  type: text('type', { enum: ['antrag', 'stellungnahme', 'petition', 'anregung'] }).notNull(),
  title: text('title').notNull().default(''),
  /** The user's own words ("Erst du"), kept separately so the diff can always be rebuilt. */
  ownText: text('own_text').notNull().default(''),
  content: json<Record<string, unknown>>('content').notNull().default({}),
  step: integer('step').notNull().default(0),
  status: text('status', { enum: ['offen', 'gesendet'] }).notNull().default('offen'),
  createdAt: createdAt(),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const submissions = sqliteTable('submissions', {
  id: id(),
  userId: userId(),
  draftId: text('draft_id').references(() => drafts.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  recipient: text('recipient').notNull(),
  aiShare: integer('ai_share').notNull().default(0),
  mailId: text('mail_id'),
  status: text('status', { enum: ['gesendet', 'fehlgeschlagen', 'unklar'] }).notNull(),
  sentAt: createdAt(),
});

export const newsItems = sqliteTable('news_items', {
  id: id(),
  /** Domain from the source whitelist. */
  source: text('source').notNull(),
  title: text('title').notNull(),
  /** Short teaser only, never the full article. */
  teaser: text('teaser').notNull().default(''),
  url: text('url').notNull(),
  publishedAt: text('published_at').notNull(),
  topics: json<string[]>('topics').notNull().default([]),
  region: text('region'),
  fetchedAt: createdAt(),
}, (t) => [uniqueIndex('news_url').on(t.url)]);

export const opportunities = sqliteTable('opportunities', {
  id: id(),
  type: text('type', { enum: ['petition', 'ehrenamt', 'beteiligung'] }).notNull(),
  source: text('source').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  url: text('url').notNull(),
  region: text('region'),
  deadline: text('deadline'),
  topics: json<string[]>('topics').notNull().default([]),
  /** When a human or the fetcher last confirmed the link. */
  checkedAt: createdAt(),
}, (t) => [uniqueIndex('opportunity_url').on(t.url)]);

export const saved = sqliteTable('saved', {
  userId: userId(),
  kind: text('kind', { enum: ['news', 'opportunity'] }).notNull(),
  itemId: text('item_id').notNull(),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.kind, t.itemId] })]);

/** Server-owned research; client-supplied contacts cannot overwrite it. */
export const agentRuns = sqliteTable('agent_runs', {
  id: id(), userId: userId(),
  draftId: text('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull(),
  result: json<import('../research/types').ApplicationResult>('result').notNull(),
  createdAt: createdAt(),
});
export const gmailAccounts = sqliteTable('gmail_accounts', {
  userId: userId().primaryKey(), email: text('email').notNull(),
  refreshToken: text('refresh_token').notNull(), connectedAt: text('connected_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const gmailStates = sqliteTable('gmail_states', {
  stateHash: text('state_hash').primaryKey(), userId: userId(), sessionHash: text('session_hash').notNull(),
  verifier: text('verifier').notNull(), returnPath: text('return_path').notNull(), expiresAt: integer('expires_at').notNull(),
});
export const mailReviews = sqliteTable('mail_reviews', {
  id: id(), userId: userId(), draftId: text('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  snapshotHash: text('snapshot_hash').notNull(),
  payload: json<import('../gmail/types').MailPayload>('payload').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
/** One durable claim per draft. An ambiguous Gmail timeout is never automatically retried. */
export const mailDeliveries = sqliteTable('mail_deliveries', {
  draftId: text('draft_id').primaryKey().references(() => drafts.id, { onDelete: 'cascade' }),
  userId: userId(), reviewId: text('review_id').notNull(),
  state: text('state', { enum: ['sending', 'sent', 'uncertain', 'failed'] }).notNull(),
  messageId: text('message_id'), submissionId: text('submission_id'), createdAt: createdAt(),
});

