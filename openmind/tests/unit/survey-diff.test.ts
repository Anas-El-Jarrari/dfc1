import { describe, expect, it } from 'vitest';
import { distribute, surveyResults } from '@/lib/survey';
import { ownershipDiff } from '@/lib/diff';
import { rankTopics } from '@/lib/topics';
import type { Topic } from '@/lib/types';

describe('Umfrage-Ergebnisse', () => {
  it('bleiben unter 20 Antworten verborgen', () => {
    const r = surveyResults([5, 5, 5, 4]);
    expect(r.visible).toBe(false);
    if (!r.visible) expect(r.missing).toBe(1);
  });

  it('werden ab genau 20 Antworten sichtbar', () => {
    const r = surveyResults([5, 5, 5, 5]);
    expect(r.visible).toBe(true);
  });

  it('verteilt Antworten ohne Verlust', () => {
    expect(distribute(23, [5, 4, 3, 2]).reduce((a, b) => a + b, 0)).toBe(23);
  });
});

describe('Schwarz/Grau-Diff', () => {
  it('markiert nur hinzugefügte Wörter als KI', () => {
    const { segments, aiPercent } = ownershipDiff('Ich finde die Radwege gut.', 'Ich finde die geplanten Radwege gut.');
    expect(segments.filter((s) => s.ai).map((s) => s.text.trim())).toEqual(['geplanten']);
    expect(aiPercent).toBe(17);
  });

  it('ist 0 % ohne Änderung', () => {
    expect(ownershipDiff('Mein Text.', 'Mein Text.').aiPercent).toBe(0);
  });
});

describe('Relevanz statt Richtung', () => {
  const mk = (id: string, deadline: string, stats: Topic['stats'], tags: string[] = []) =>
    ({ id, deadline, stats, tags, level: 'bund', location: 'Bund' }) as unknown as Topic;

  it('ignoriert das Meinungsbild bei der Sortierung', () => {
    const a = mk('a', '2026-12-01', { pro: 90, contra: 5, neutral: 5, total: 1 });
    const b = mk('b', '2026-11-01', { pro: 5, contra: 90, neutral: 5, total: 1 });
    expect(rankTopics([a, b], [], 'Düsseldorf').map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('stellt Interessen vor Frist', () => {
    const a = mk('a', '2026-12-01', { pro: 1, contra: 1, neutral: 1, total: 1 }, ['Verkehr']);
    const b = mk('b', '2026-11-01', { pro: 1, contra: 1, neutral: 1, total: 1 });
    expect(rankTopics([a, b], ['Verkehr'], 'X')[0].id).toBe('a');
  });
});

import { aiShareOf, mergeEdit } from '@/lib/diff';

describe('Hand-Änderungen im Entwurf', () => {
  const segs = [{ text: 'Ich wünsche mir ', ai: false }, { text: 'bitte zeitnah ', ai: true }, { text: 'eine Ampel.', ai: false }];
  it('selbst getippte Wörter werden schwarz, KI-Wörter bleiben grau', () => {
    const out = mergeEdit(segs, 'Ich wünsche mir bitte zeitnah eine sichere Ampel.');
    expect(out.filter((s) => s.ai).map((s) => s.text.trim())).toEqual(['bitte zeitnah']);
    expect(out.map((s) => s.text).join('')).toBe('Ich wünsche mir bitte zeitnah eine sichere Ampel.');
  });
  it('gelöschte KI-Wörter senken den KI-Anteil', () => {
    expect(aiShareOf(segs)).toBeGreaterThan(0);
    expect(aiShareOf(mergeEdit(segs, 'Ich wünsche mir eine Ampel.'))).toBe(0);
  });
});
