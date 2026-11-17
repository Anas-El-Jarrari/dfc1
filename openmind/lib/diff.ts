import { diffWords } from 'diff';

export interface Segment { text: string; ai: boolean }

/** Words kept from the user stay black; words the AI added are grey. Removed words are dropped. */
export function ownershipDiff(original: string, suggestion: string): { segments: Segment[]; aiPercent: number } {
  const parts = diffWords(original, suggestion);
  const segments: Segment[] = parts.filter((p) => !p.removed).map((p) => ({ text: p.value, ai: Boolean(p.added) }));
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const total = segments.reduce((n, s) => n + count(s.text), 0);
  const ai = segments.filter((s) => s.ai).reduce((n, s) => n + count(s.text), 0);
  return { segments, aiPercent: total ? Math.round((ai / total) * 100) : 0 };
}

/** Share of words that came from the AI, in percent. */
export function aiShareOf(segments: Segment[]) {
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const total = segments.reduce((n, s) => n + count(s.text), 0);
  const ai = segments.filter((s) => s.ai).reduce((n, s) => n + count(s.text), 0);
  return total ? Math.round((ai / total) * 100) : 0;
}

/**
 * The person edited the text by hand. Words they typed are theirs (black); untouched words keep
 * their origin; deleted words disappear. Neighbouring pieces with the same origin are merged.
 */
export function mergeEdit(segments: Segment[], edited: string): Segment[] {
  // Expand to one entry per character so origins survive the word diff exactly.
  const origin: boolean[] = segments.flatMap((s) => Array.from(s.text, () => s.ai));
  const before = segments.map((s) => s.text).join('');
  const out: Segment[] = [];
  const push = (text: string, ai: boolean) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.ai === ai) last.text += text;
    else out.push({ text, ai });
  };
  let pos = 0;
  for (const part of diffWords(before, edited)) {
    if (part.added) { push(part.value, false); continue; }
    if (part.removed) { pos += part.value.length; continue; }
    for (const ch of part.value) push(ch, origin[pos++] ?? false);
  }
  return out;
}
