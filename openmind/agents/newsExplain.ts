import { z } from 'zod';
import { callJSON } from '@/core/ai/json';
import { mustPass } from '@/core/guardian';
import { HttpError } from '@/core/http/safeRoute';
import { SYSTEM_BASE } from '@/lib/prompts';
import { getSource } from '@/core/sources';
import { defineAgent } from './types';

const PROMPT = `${SYSTEM_BASE}

Erkläre eine amtliche Meldung in höchstens 2 kurzen Sätzen, in einfacher Sprache.
Nutze nur Titel und Anriss, die du bekommst. Erfinde nichts dazu. Keine Wertung.

AUSGABEFORMAT (streng JSON):
{ "summary": "..." }`;

/** "Kurz erklärt" for news. Only sources whose terms allow a summary (official texts). */
export default defineAgent({
  name: 'news-explain',
  needsKey: true,
  input: z.object({ source: z.string(), title: z.string().min(1).max(300), teaser: z.string().max(400).default('') }),
  async run({ source, title, teaser }) {
    if (!getSource(source)?.summarize) throw new HttpError(400, 'Diese Quelle fassen wir nicht zusammen. Lies sie bitte im Original.');
    const out = await callJSON({ system: PROMPT, user: `Titel: ${title}\nAnriss: ${teaser}`, schema: z.object({ summary: z.string() }), maxTokens: 300 });
    return { ...out, guardian: await mustPass(out.summary) };
  },
});
