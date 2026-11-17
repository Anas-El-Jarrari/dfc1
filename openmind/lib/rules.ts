import type { GuardianResult } from './types';

// Deterministic first line of the Guardian: catches recommendations even if the model check is unavailable.
const RECOMMENDATION_PATTERNS = [
  /\b(du|ihr|sie)\s+solltest?\b/i,
  /\bsolltet\b/i,
  /\bich\s+(empfehle|rate|würde)\b/i,
  /\b(stimm|unterschreib)\w*\s+(dafür|dagegen|zu|mit ja|mit nein)\b/i,
  /\b(dafür|dagegen)\s+stimmen\b/i,
  /\bmeine empfehlung\b/i,
  /\bam besten\s+(stimmst|wählst|unterschreibst)\b/i,
];

const HATE_PATTERNS = [/\b(abschaum|gesindel|volksverräter)\b/i];

export function ruleGuardian(text: string): GuardianResult {
  const issues: GuardianResult['issues'] = [];
  for (const p of RECOMMENDATION_PATTERNS) {
    const m = text.match(p);
    if (m) issues.push({ type: 'empfehlung', text: m[0], severity: 'kritisch' });
  }
  for (const p of HATE_PATTERNS) {
    const m = text.match(p);
    if (m) issues.push({ type: 'hetze', text: m[0], severity: 'kritisch' });
  }
  return { pass: issues.length === 0, issues, checkedAt: new Date().toISOString() };
}

const LOADED_WORDS: Record<string, string> = {
  unsinnig: 'wertend', unsinnigen: 'wertend', sinnlos: 'wertend', sinnlosen: 'wertend',
  absurd: 'wertend', absurden: 'wertend', katastrophal: 'wertend', dumm: 'wertend',
  'auch gegen': 'suggestiv', 'auch für': 'suggestiv', 'nicht auch': 'suggestiv',
  'wie alle': 'suggestiv', 'natürlich': 'suggestiv', 'endlich': 'wertend',
};

export interface NeutralityIssue { original: string; type: string; explanation: string; suggestion: string }

export function ruleNeutrality(text: string): NeutralityIssue[] {
  const lower = text.toLowerCase();
  return Object.entries(LOADED_WORDS)
    .filter(([w]) => new RegExp(`\\b${w}\\b`).test(lower))
    .map(([w, type]) => ({
      original: w,
      type,
      explanation: type === 'wertend' ? 'Das Wort bewertet schon in der Frage.' : 'Die Frage legt eine Antwort nahe.',
      suggestion: 'weglassen oder neutral formulieren',
    }));
}

// Fallback neutral rewrite for the documented test case and similar "Bist du auch gegen X?" questions.
export function ruleNeutralRewrite(text: string): string | null {
  const m = text.match(/bist du (?:auch |nicht auch )?(?:gegen|für) (?:die |den |das )?(?:\w+\s+)?(\w+)\??/i);
  if (!m) return null;
  const noun = m[1];
  const article = /e$|en$/.test(noun) ? 'die' : 'das';
  return `Wie bewertest du ${article} geplanten ${noun}?`;
}
