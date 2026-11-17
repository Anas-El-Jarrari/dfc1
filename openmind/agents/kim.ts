import { z } from 'zod';
import { callText, parseJSON } from '@/core/ai/json';
import { mustPass } from '@/core/guardian';
import { AGENT_PROMPT, APP_SCREENS } from '@/lib/prompts';
import { TOPICS, corpusText, getTopic } from '@/lib/topics';
import { defineAgent } from './types';

const ALLOWED_LINK = /^\/(check|entdecken|thema\/[a-z0-9-]+(\/stellungnahme)?|mitmachen(\/(antrag|petition|umfrage|anregen))?|umfragen|stimme|engagieren|wirkung|ich)$/;

const output = z.object({
  reply: z.string(),
  sources: z.array(z.object({ topicId: z.string(), id: z.coerce.string() })).default([]),
  links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  pose: z.enum(['listen', 'search', 'counter', 'unknown']).catch('listen'),
});

export default defineAgent({
  name: 'kim',
  needsKey: true,
  input: z.object({
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1),
    topicId: z.string().optional(),
  }),
  async run({ messages, topicId }) {
    const focus = topicId ? getTopic(topicId) : undefined;
    const corpus = TOPICS.map((t) => `## ${t.title} (topicId: ${t.id})\n${corpusText(t)}`).join('\n\n');
    const system = `${AGENT_PROMPT}\n\n${APP_SCREENS}\n\n${focus ? `Aktuelles Thema: ${focus.title} (${focus.id})\n\n` : ''}Quellenkorpus:\n${corpus}`;

    const text = await callText({ system, messages: messages.slice(-12), maxTokens: 800 });
    let out: z.infer<typeof output>;
    try {
      out = parseJSON(text, output);
    } catch {
      // A plain-text answer is still usable; it just carries no sources or links.
      out = { reply: text.trim(), sources: [], links: [], pose: 'listen' };
    }
    out.links = out.links.filter((l) => ALLOWED_LINK.test(l.href)).slice(0, 2);
    out.sources = out.sources.filter((s) => getTopic(s.topicId)?.corpus.some((c) => c.id === s.id));
    return { ...out, guardian: await mustPass(out.reply) };
  },
});
