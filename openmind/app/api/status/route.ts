import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { agentNames } from '@/agents/registry';
import { ollamaStatus } from '@/core/ai/client';
import { db } from '@/core/db/client';
import { checkMail } from '@/core/mail';
import { configured } from '@/core/gmail/client';
import { searchUrl } from '@/core/research/web';
import { users } from '@/core/db/schema';
export async function GET(req: Request) {
  void req.headers;
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Nicht verfügbar' }, { status: 404 });
  let dbState;
  try { await db.select({ n: sql<number>`count(*)` }).from(users); dbState = { ok: true, detail: 'Datenbank erreichbar' }; }
  catch { dbState = { ok: false, detail: 'Tabellen fehlen. Führe npm run db:migrate aus.' }; }
  let search;
  try { const response = await fetch(searchUrl() + '/search?q=OpenMind&format=json', { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    const data = await response.json(); search = { ok: response.ok && Array.isArray(data.results), detail: 'SearXNG · JSON-Suche' };
  } catch { search = { ok: false, detail: 'SearXNG ist nicht erreichbar.' }; }
  return NextResponse.json({ ai: await ollamaStatus(), db: dbState, mail: await checkMail(), gmail: { configured: configured() }, search, agents: [...agentNames(), 'application'] });
}

