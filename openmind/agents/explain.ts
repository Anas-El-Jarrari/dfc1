import { z } from 'zod';
import { callJSON } from '@/core/ai/json';
import { mustPass } from '@/core/guardian';
import { HttpError } from '@/core/http/safeRoute';
import { EXPLAIN_PROMPT } from '@/lib/prompts';
import { corpusText, getTopic } from '@/lib/topics';
import { defineAgent } from './types';

const level = z.enum(['bilder', 'leicht', 'einfach', 'original']);

export default defineAgent({
  name: 'explain',
  needsKey: true,
  input: z.object({ topicId: z.string(), level }),
  async run(input) {
    const topic = getTopic(input.topicId);
    if (!topic) throw new HttpError(404, 'Thema unbekannt');
    const result = await callJSON({
      system: EXPLAIN_PROMPT,
      user: `Stufe: ${input.level}\nThema: ${topic.title}\n\nQuellenkorpus (nur diese Quellen verwenden):\n${corpusText(topic)}`,
      schema: z.object({
        sentences: z.array(z.object({ text: z.string(), sourceId: z.coerce.string() })),
        level: level.catch(input.level),
      }),
    });
    const ids = new Set(topic.corpus.map((c) => c.id));
    result.sentences = result.sentences.filter((s) => ids.has(s.sourceId));
    return { ...result, guardian: await mustPass(result.sentences.map((s) => s.text).join(' ')) };
  },
});
