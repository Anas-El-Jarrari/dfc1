import { z } from 'zod';
import { hasKey } from '@/core/ai/client';
import { callJSON } from '@/core/ai/json';
import { NEUTRALITY_PROMPT } from '@/lib/prompts';
import { ruleNeutralRewrite, ruleNeutrality } from '@/lib/rules';
import { defineAgent } from './types';

const issue = z.object({ original: z.string(), type: z.string(), explanation: z.string().default(''), suggestion: z.string().default('') });

export default defineAgent({
  name: 'neutrality',
  needsKey: false,
  input: z.object({ text: z.string().trim().min(1) }),
  async run({ text }) {
    const ruleIssues = ruleNeutrality(text);
    if (hasKey()) {
      try {
        const r = await callJSON({
          system: NEUTRALITY_PROMPT,
          user: `Text:\n${text}`,
          schema: z.object({ issues: z.array(issue).default([]), neutralVersion: z.string() }),
        });
        const seen = new Set(r.issues.map((i) => i.original.toLowerCase()));
        return { issues: [...r.issues, ...ruleIssues.filter((i) => !seen.has(i.original))], neutralVersion: r.neutralVersion };
      } catch {
        // Fall through to the rule-based answer.
      }
    }
    return {
      issues: ruleIssues,
      neutralVersion: ruleIssues.length ? ruleNeutralRewrite(text) ?? 'Bitte ohne wertende Wörter neu formulieren.' : text,
      source: 'regeln',
    };
  },
});
