import { z } from 'zod';
import { callJSON } from '@/core/ai/json';
import { mustPass } from '@/core/guardian';
import { HttpError } from '@/core/http/safeRoute';
import { WEIGH_PROMPT } from '@/lib/prompts';
import { corpusText, getTopic } from '@/lib/topics';
import { defineAgent } from './types';

const argument = z.object({ text: z.string(), sourceId: z.coerce.string(), relevance: z.string().default('mittel') });

export default defineAgent({
  name: 'weigh',
  needsKey: true,
  input: z.object({
    topicId: z.string(),
    // "Erst du": without the user's own tendency there is no AI help.
    tendency: z.string().min(1),
    values: z.array(z.string()).default([]),
  }),
  async run({ topicId, tendency, values }) {
    const topic = getTopic(topicId);
    if (!topic) throw new HttpError(404, 'Thema unbekannt');
    const result = await callJSON({
      system: WEIGH_PROMPT,
      user:
        `Thema: ${topic.title}\nEigene Tendenz: ${tendency}\nWerte der Nutzer*in: ${values.join(', ')}\n` +
        `Höchstens 3 Punkte pro Seite, je max. 12 Wörter.\n\nQuellenkorpus:\n${corpusText(topic)}`,
      schema: z.object({
        pro: z.array(argument),
        contra: z.array(argument),
        strongestCounter: z.object({ text: z.string(), sourceId: z.coerce.string() }),
      }),
    });
    const pro = result.pro.slice(0, 3);
    const contra = result.contra.slice(0, 3);
    const guardian = await mustPass([...pro, ...contra, result.strongestCounter].map((a) => a.text).join(' '));
    return { pro, contra, strongestCounter: result.strongestCounter, blick2050: topic.blick2050, guardian };
  },
});
