import { z } from 'zod';
import { callJSON } from '@/core/ai/json';
import { Blocked, guardian } from '@/core/guardian';
import { REPHRASE_PROMPT } from '@/lib/prompts';
import { defineAgent } from './types';

export default defineAgent({
  name: 'rephrase',
  needsKey: true,
  input: z.object({ text: z.string().trim().min(1) }),
  async run({ text }) {
    const result = await callJSON({
      system: REPHRASE_PROMPT,
      user: `Text der Nutzer*in:\n${text}`,
      schema: z.object({ suggestion: z.string(), aiPercentage: z.coerce.number().catch(0) }),
    });
    // A rewrite must not add a recommendation the user never wrote; the user's own opinion is allowed to stay.
    const check = await guardian(result.suggestion);
    if (!check.pass && !(await guardian(text)).issues.length) throw new Blocked(check);
    return { ...result, original: text, guardian: check };
  },
});
