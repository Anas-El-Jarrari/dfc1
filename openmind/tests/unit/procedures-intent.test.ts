import { describe, expect, it } from 'vitest';
import { classifyByRules, completeness, getProcedure, missingFields, templateLetter } from '@/core/procedures';
import { routeIntent } from '@/features/kim/intent';

describe('Verfahren', () => {
  it('Stadt-Themen landen beim § 24, Landesthemen beim Landtag', () => {
    expect(classifyByRules('Die Ampel am Schulweg in Bilk ist zu kurz grün').procedure.id).toBe('anregung-24');
    expect(classifyByRules('Meine Schule hat zu wenige Lehrer').procedure.id).toBe('petition-landtag');
    expect(classifyByRules('Irgendwas ganz anderes').procedure.id).toBe('anregung-24');
  });
  it('Vorlage übernimmt die eigenen Worte wörtlich und fügt nichts hinzu', () => {
    const p = getProcedure('anregung-24')!;
    const own = 'Die Ampel an der Bilker Allee ist für Kinder zu kurz grün.';
    const { subject, body } = templateLetter(p, { title: 'Ampel Bilker Allee', ownText: own, answers: { ort: 'Bilker Allee' }, name: 'Mira' });
    expect(subject).toBe('Anregung an den Rat: Ampel Bilker Allee');
    expect(body).toContain(own);
    expect(body).toContain('Ort: Bilker Allee');
    expect(body.endsWith('Mit freundlichen Grüßen\nMira')).toBe(true);
  });
  it('Vollständigkeits-Check findet fehlende Angaben', () => {
    const p = getProcedure('anregung-24')!;
    expect(missingFields(p, { ort: 'x' }).map((f) => f.key)).toEqual(['betroffen', 'ziel']);
    const letter = templateLetter(p, { title: 't', ownText: 'eins zwei drei vier fünf', answers: {} });
    const checks = completeness(p, { ownText: 'eins zwei drei vier fünf', answers: {}, ...letter, recipient: null, ownEmail: 'a@b.de' });
    expect(checks.filter((c) => !c.ok).map((c) => c.label)).toEqual(['Ort', 'Wer ist betroffen?', 'Was soll passieren?', 'Empfänger eingetragen']);
  });
});

describe('Kim erkennt Absichten ohne KI', () => {
  it('„Stimmt das …“ führt zum Fakten-Check mit der Behauptung', () => {
    const r = routeIntent('Stimmt das, dass Düsseldorf größer als Köln ist?');
    expect(r?.links?.[0].href).toBe(`/check?text=${encodeURIComponent('Düsseldorf größer als Köln ist?')}`);
  });
  it('„Ich möchte …“ führt zum Antrag', () => {
    expect(routeIntent('Ich möchte eine Ampel am Schulweg')?.links?.[0].href).toMatch(/^\/mitmachen\/antrag\?text=/);
  });
  it('normale Fragen gehen an Kim', () => {
    expect(routeIntent('Wer entscheidet über die Radwege?')).toBeUndefined();
  });
});
