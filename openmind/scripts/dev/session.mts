// Creates a signed-in session for an e-mail and prints the cookie value. For local measurements (Lighthouse, screenshots).
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
const { db } = await import('../../core/db/client');
const schema = await import('../../core/db/schema');

const email = process.argv[2] ?? 'lighthouse@example.org';
let [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
if (!user) [user] = await db.insert(schema.users).values({ email, name: 'Mira' }).returning();
await db.insert(schema.profiles).values({ userId: user.id, district: 'Düsseldorf-Bilk', interests: ['Verkehr', 'Kinder', 'Klima'], values: ['Sicherheit', 'Familie'], onboarded: true, tutorialDone: true }).onConflictDoNothing();
await db.insert(schema.settings).values({ userId: user.id, ownEmail: email }).onConflictDoNothing();
const token = randomBytes(32).toString('hex');
await db.insert(schema.sessions).values({ tokenHash: createHash('sha256').update(token).digest('hex'), userId: user.id, expiresAt: Date.now() + 86_400_000 });
console.log(token);
process.exit(0);
