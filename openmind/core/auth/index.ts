import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { HttpError } from '@/core/http/safeRoute';
import { sendMail } from '@/core/mail';

export const SESSION_COOKIE = 'om_session';
const LINK_MINUTES = 15;
const SESSION_DAYS = 30;
const MAX_LINKS = 5;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('hex');

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 86400,
};

/** Creates a one-time link and mails it. Returns the link only when no real mail was sent (demo setup or test address). */
export async function requestLogin(email: string, origin: string) {
  const now = Date.now();
  await db.delete(schema.loginTokens).where(lt(schema.loginTokens.expiresAt, now));
  const open = await db.select().from(schema.loginTokens).where(eq(schema.loginTokens.email, email));
  if (open.length >= MAX_LINKS) throw new HttpError(429, 'Zu viele Anfragen. Warte ein paar Minuten und versuch es noch einmal.');

  const token = newToken();
  await db.insert(schema.loginTokens).values({ tokenHash: hash(token), email, expiresAt: now + LINK_MINUTES * 60_000 });
  const link = `${origin}/api/auth/verify?token=${token}`;
  const { delivered } = await sendMail({
    to: email,
    subject: 'Dein Anmelde-Link für OpenMind',
    text: `Hallo!\n\nMit diesem Link meldest du dich bei OpenMind an:\n${link}\n\nEr gilt ${LINK_MINUTES} Minuten und nur einmal.\nWenn du das nicht warst, ignoriere diese Mail.`,
  });
  // Only when no real mail went out (demo mode or a reserved test address) and never in production.
  const demo = !delivered && process.env.NODE_ENV !== 'production';
  return { demoLink: demo ? link : undefined };
}

/** Redeems a link: creates the account on first use and opens a session. Returns the session token for the cookie. */
export async function verifyLogin(token: string) {
  const [row] = await db.delete(schema.loginTokens).where(eq(schema.loginTokens.tokenHash, hash(token))).returning();
  if (!row || row.expiresAt < Date.now()) return undefined;

  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, row.email));
  if (!user) {
    [user] = await db.insert(schema.users).values({ email: row.email }).returning();
  }
  await db.insert(schema.profiles).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(schema.settings).values({ userId: user.id, ownEmail: user.email }).onConflictDoNothing();

  const session = newToken();
  await db.insert(schema.sessions).values({ tokenHash: hash(session), userId: user.id, expiresAt: Date.now() + SESSION_DAYS * 86_400_000 });
  return session;
}

function sessionToken(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  return cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

/** The signed-in user of this request, or undefined. */
export async function getUser(req: Request) {
  const token = sessionToken(req);
  if (!token) return undefined;
  const [row] = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, hash(token)), gt(schema.sessions.expiresAt, Date.now())));
  return row?.user;
}

export async function requireUser(req: Request) {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, 'Bitte melde dich an.');
  return user;
}

export async function endSession(req: Request) {
  const token = sessionToken(req);
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hash(token)));
}
