import { z } from 'zod';
import { hasKey } from '@/core/ai/client';
import { callJSON } from '@/core/ai/json';
import { Blocked, guardian } from '@/core/guardian';
import { HttpError } from '@/core/http/safeRoute';
import { getProcedure, templateLetter } from '@/core/procedures';
import { SYSTEM_BASE } from '@/lib/prompts';
import { corpusText, getTopic } from '@/lib/topics';
import { defineAgent } from './types';

const PROMPT = `${SYSTEM_BASE}

Du schreibst ein förmliches Schreiben FÜR die Nutzer*in, in ihrem Namen, in der Ich-Form.
Regel "Erst du": Die eigenen Sätze der Nutzer*in sind der Kern. Übernimm sie so wörtlich wie möglich,
korrigiere nur Rechtschreibung und Grammatik. Füge KEINE neuen Argumente, Forderungen oder Fakten hinzu.
Schiebe nichts in die Sätze der Nutzer*in ein (keine Klammern, keine Ortsangaben, keine Fußnoten). Angaben wie Ort oder Wunsch kommen in eigene, zusätzliche Sätze davor oder danach.
Fakten darfst du nur aus dem mitgelieferten Quellenkorpus ergänzen, mit Fußnote [n], und nur wenn sie das Anliegen sachlich stützen.
Gibt es keinen Quellenkorpus, setze KEINE Fußnoten.
Halte den vorgegebenen Rahmen ein (Anrede, Einleitung, Schluss, Gruß). Höchstens 200 Wörter.

AUSGABEFORMAT (streng JSON):
{ "subject": "...", "body": "..." }`;

const input = z.object({
  procedureId: z.string(),
  title: z.string().max(120).default(''),
  ownText: z.string().trim().min(10, 'Erst du: Schreib zuerst ein paar eigene Sätze.').max(2000),
  answers: z.record(z.string(), z.string().max(300)).default({}),
  name: z.string().max(80).default(''),
  topicId: z.string().optional(),
  /** The strongest counter-argument, if the person chose to address it. */
  counter: z.string().max(300).optional(),
});

/**
 * Builds the letter. Without an API key (or if the AI output fails the Guardian) it falls back
 * to the plain template, so the flow always works.
 */
export default defineAgent({
  name: 'draft',
  needsKey: false,
  input,
  async run(d) {
    const procedure = getProcedure(d.procedureId);
    if (!procedure) throw new HttpError(404, 'Dieses Verfahren gibt es nicht.');
    const topic = d.topicId ? getTopic(d.topicId) : undefined;
    const template = templateLetter(procedure, { ...d, context: topic?.title });
    if (!hasKey()) return { ...template, ai: false, note: 'Ohne KI erstellt: Rahmen plus deine Worte.' };

    const facts = procedure.fields.map((f) => `${f.label}: ${d.answers[f.key] ?? '–'}`).join('\n');
    const out = await callJSON({
      system: PROMPT,
      user:
        `Verfahren: ${procedure.title} (${procedure.legalBasis})\nEmpfänger: ${procedure.recipientHint}\n` +
        `Rahmen:\nAnrede: ${procedure.salutation}\nEinleitung: ${procedure.opening}\nSchluss: ${procedure.closing}\nGruß: Mit freundlichen Grüßen, ${d.name || '(ohne Namen)'}\n\n` +
        `Titel: ${d.title}\nEigene Worte der Nutzer*in:\n${d.ownText}\n\nAngaben:\n${facts}\n` +
        (d.counter ? `\nDie Nutzer*in möchte auf diesen Einwand eingehen: ${d.counter}\n` : '') +
        (topic ? `\nVorhaben: ${topic.title}\nQuellenkorpus:\n${corpusText(topic)}\n` : ''),
      schema: z.object({ subject: z.string().min(3), body: z.string().min(20) }),
      maxTokens: 1200,
    });

    // Footnotes must point to a real source of the topic; without one (or beyond the corpus) they are removed.
    const sourceIds = new Set(topic?.corpus.map((c) => String(c.id)) ?? []);
    out.body = out.body.replace(/\s?\[(\d+)\]/g, (m, n) => (sourceIds.has(n) ? m : '')).replace(/ +([.,;:])/g, '$1');

    // A letter may state the person's own demand; it must not gain a recommendation the person never wrote.
    const check = await guardian(out.body);
    if (!check.pass && (await guardian(d.ownText)).pass) {
      if (check.issues.some((i) => i.severity === 'kritisch')) throw new Blocked(check);
    }
    return { ...out, ai: true, guardian: check };
  },
});
