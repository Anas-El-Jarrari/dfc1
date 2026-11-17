import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SESSION_COOKIE, getUser, requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';

const optionalEmail = z.union([z.literal('').transform(() => null), z.string().trim().toLowerCase().pipe(z.email())]).nullable();

const patch = z.object({
  name: z.string().trim().max(60).nullable().optional(),
  profile: z.object({
    district: z.string().trim().max(80).nullable(),
    postalCode: z.string().trim().max(10).nullable(),
    interests: z.array(z.string().max(40)).max(30),
    values: z.array(z.string().max(40)).max(30),
    easyLanguage: z.boolean(),
    kimDisabled: z.boolean(),
    consentProfile: z.boolean(),
    onboarded: z.boolean(),
    tutorialDone: z.boolean(),
  }).partial().optional(),
  settings: z.object({ ownEmail: optionalEmail }).partial().optional(),
});

async function load(userId: string) {
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  const [settings] = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId));
  return { profile, settings };
}

/** The signed-in account, or { user: null } – being signed out is a normal state here, not an error. */
export const GET = safeRoute(async (req: Request) => {
  const user = await getUser(req);
  if (!user) {
    const res = NextResponse.json({ user: null });
    // A cookie whose session no longer exists (expired, signed out elsewhere, account deleted) is removed,
    // so the proxy sends the next visit straight to the sign-in page.
    if (req.headers.get('cookie')?.includes(`${SESSION_COOKIE}=`)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  return NextResponse.json({ user, ...(await load(user.id)) });
});

export const PATCH = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  const body = patch.parse(await req.json());
  if (body.name !== undefined) await db.update(schema.users).set({ name: body.name || null }).where(eq(schema.users.id, user.id));
  if (body.profile && Object.keys(body.profile).length) await db.update(schema.profiles).set(body.profile).where(eq(schema.profiles.userId, user.id));
  if (body.settings && Object.keys(body.settings).length) await db.update(schema.settings).set(body.settings).where(eq(schema.settings.userId, user.id));
  return NextResponse.json({ user: { ...user, name: body.name === undefined ? user.name : body.name || null }, ...(await load(user.id)) });
});

/** Deletes the account and, through cascading foreign keys, everything that belongs to it. */
export const DELETE = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
