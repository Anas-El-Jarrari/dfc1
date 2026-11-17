import { eq } from 'drizzle-orm';
import { requireUser } from '@/core/auth';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { safeRoute } from '@/core/http/safeRoute';

/** Everything stored about the signed-in person, as one JSON file (Art. 15 and 20 DSGVO). */
export const GET = safeRoute(async (req: Request) => {
  const user = await requireUser(req);
  const by = <T extends { userId: unknown }>(table: T) => eq(table.userId as never, user.id);
  const data = {
    exportiertAm: new Date().toISOString(),
    konto: user,
    profil: (await db.select().from(schema.profiles).where(by(schema.profiles)))[0] ?? null,
    einstellungen: (await db.select().from(schema.settings).where(by(schema.settings)))[0] ?? null,
    entwuerfe: await db.select().from(schema.drafts).where(by(schema.drafts)),
    gesendet: await db.select().from(schema.submissions).where(by(schema.submissions)),
    recherchen: await db.select().from(schema.agentRuns).where(by(schema.agentRuns)),
    gmail: (await db.select({ email: schema.gmailAccounts.email, verbundenAm: schema.gmailAccounts.connectedAt }).from(schema.gmailAccounts).where(by(schema.gmailAccounts)))[0] ?? null,
    gemerkt: await db.select().from(schema.saved).where(by(schema.saved)),
    hinweis: 'Tendenzen, Umfrage-Antworten und der Chat-Verlauf liegen nur in deinem Browser und sind hier nicht enthalten.',
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="openmind-meine-daten.json"' },
  });
});
