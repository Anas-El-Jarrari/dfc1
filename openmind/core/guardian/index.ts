import { z } from 'zod';
import { hasKey } from '@/core/ai/client';
import { callJSON } from '@/core/ai/json';
import { GUARDIAN_PROMPT } from '@/lib/prompts';
import { ruleGuardian } from '@/lib/rules';
import type { GuardianResult } from '@/lib/types';

const schema = z.object({
  pass: z.boolean(),
  issues: z.array(z.object({ type: z.string(), text: z.string(), severity: z.string() })).default([]),
  checkedAt: z.string().default(() => new Date().toISOString()),
});

/** Thrown by an agent when its output fails the check; the route turns it into a "blocked" answer. */
export class Blocked extends Error {
  constructor(public check: GuardianResult) {
    super('blocked');
  }
}

/** Rule check first, then a separate local model call if Ollama is enabled. */
export async function guardian(output: string): Promise<GuardianResult> {
  const rules = ruleGuardian(output);
  if (!rules.pass || !hasKey()) return rules;
  try {
    const check = await callJSON({ system: GUARDIAN_PROMPT, user: `Prüfe diese KI-Ausgabe:\n\n${output}`, schema });
    // Only a critical issue blocks; warnings are kept for transparency. The time comes from us, not the model.
    // A "fail" without any stated reason still blocks, to stay on the safe side.
    const blocked = check.issues.some((i) => i.severity === 'kritisch') || (!check.pass && check.issues.length === 0);
    return { ...check, pass: !blocked, checkedAt: new Date().toISOString() };
  } catch {
    return { pass: false, issues: [{ type: 'technik', text: 'Prüfung nicht möglich', severity: 'kritisch' }], checkedAt: new Date().toISOString() };
  }
}

/** Returns the check result or throws Blocked. */
export async function mustPass(output: string) {
  const check = await guardian(output);
  if (!check.pass) throw new Blocked(check);
  return check;
}

export const BLOCKED_MESSAGE = 'Diese Antwort hat die Ethik-Prüfung nicht bestanden und wird nicht angezeigt.';
