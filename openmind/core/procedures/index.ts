import anregung from '@/data/procedures/anregung-24.json';
import landtag from '@/data/procedures/petition-landtag.json';
import stellungnahme from '@/data/procedures/stellungnahme.json';

export interface ProcedureField { key: string; label: string; question: string; placeholder: string; chips: string[] }

/** A participation procedure as data: required fields, letter frame, legal basis. New procedure = new JSON file + one entry below. */
export interface Procedure {
  id: string;
  kind: 'antrag' | 'petition' | 'stellungnahme';
  title: string;
  short: string;
  level: 'stadt' | 'land' | 'bund' | 'eu';
  legalBasis: string;
  recipientHint: string;
  officialUrl: string;
  explain: string;
  keywords: string[];
  fields: ProcedureField[];
  salutation: string;
  opening: string;
  closing: string;
}

export const PROCEDURES = [anregung, landtag, stellungnahme] as Procedure[];
export const getProcedure = (id: string) => PROCEDURES.find((p) => p.id === id);
/** Procedures a person can start from free text (a Stellungnahme always starts from a topic). */
export const STARTABLE = PROCEDURES.filter((p) => p.kind !== 'stellungnahme');

/** Rule-based choice of procedure: counts keyword hits. City level is the default, because most everyday concerns are local. */
export function classifyByRules(text: string): { procedure: Procedure; reason: string } {
  const lower = text.toLowerCase();
  const scored = STARTABLE.map((p) => ({ p, hits: p.keywords.filter((k) => lower.includes(k)) }));
  const best = scored.sort((a, b) => b.hits.length - a.hits.length)[0];
  if (!best.hits.length) return { procedure: STARTABLE[0], reason: 'Die meisten Anliegen im Alltag betreffen die Stadt.' };
  return { procedure: best.p, reason: `Passt zu: ${best.hits.slice(0, 3).join(', ')}` };
}

/** Which required fields are still empty. */
export function missingFields(procedure: Procedure, answers: Record<string, string>) {
  return procedure.fields.filter((f) => !answers[f.key]?.trim());
}

export interface CheckItem { label: string; ok: boolean }

/** Completeness check before sending. Deterministic, so it works without the AI. */
export function completeness(procedure: Procedure, d: { ownText: string; answers: Record<string, string>; subject: string; body: string; recipient?: string | null; ownEmail?: string | null }): CheckItem[] {
  return [
    { label: 'Dein Anliegen in eigenen Worten', ok: d.ownText.trim().split(/\s+/).length >= 5 },
    ...procedure.fields.map((f) => ({ label: f.label, ok: Boolean(d.answers[f.key]?.trim()) })),
    { label: 'Betreff', ok: d.subject.trim().length >= 5 },
    { label: 'Anrede und Gruß', ok: d.body.includes(procedure.salutation.slice(0, 15)) && /freundlichen Grüßen/.test(d.body) },
    { label: 'Empfänger eingetragen', ok: Boolean(d.recipient) },
    { label: 'Deine Adresse für die Kopie', ok: Boolean(d.ownEmail) },
  ];
}

/** Letter from the procedure frame plus the user's own words and answers. No AI, no added arguments. */
export function templateLetter(procedure: Procedure, d: { title: string; ownText: string; answers: Record<string, string>; name?: string; context?: string }) {
  const facts = procedure.fields.filter((f) => d.answers[f.key]?.trim()).map((f) => `${f.label}: ${d.answers[f.key].trim()}`);
  const subject = `${procedure.title}: ${d.title.trim() || d.ownText.trim().split(/[.!?]/)[0].slice(0, 80)}`;
  const body = [
    procedure.salutation,
    '',
    procedure.opening,
    ...(d.context ? ['', `Vorhaben: ${d.context}`] : []),
    '',
    d.ownText.trim(),
    ...(facts.length ? ['', ...facts] : []),
    '',
    procedure.closing,
    '',
    'Mit freundlichen Grüßen',
    d.name?.trim() || '',
  ].join('\n').trim();
  return { subject, body };
}
