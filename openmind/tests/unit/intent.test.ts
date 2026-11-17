import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractIntent, resolveApplicationInput, unansweredQuestions } from '@/core/research/intent';
import type { UserIntent } from '@/core/research/types';

afterEach(() => vi.unstubAllGlobals());

const intent = (overrides: Partial<UserIntent> = {}): UserIntent => ({
  summary: 'Fehlender sicherer Übergang zur Schule.', issue: 'Fehlender sicherer Übergang zur Schule', goal: '', explicitLocation: '', affected: '',
  confirmedDetails: [], needsExactLocation: true,
  openQuestions: [], searchTerms: ['sicherer Übergang zuständige Stelle', 'sicherer Übergang Kontakt', 'sicherer Übergang Rechtsgrundlage'],
  ...overrides,
});

describe('strukturierte Nutzerabsicht', () => {
  it('stellt gezielte Fragen, wenn Straße und gewünschte Handlung fehlen; kopiert den Profilort nicht in den Nutzertext', async () => {
    const raw = 'An meiner Straße fehlt ein sicherer Übergang zur Schule.';
    const modelValue = intent({ explicitLocation: 'Düsseldorf-Bilk', goal: '' });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ model: 'qwen3:8b', message: { content: JSON.stringify(modelValue) } })));
    const parsed = await extractIntent({ originalText: raw, title: raw, profileLocation: 'Düsseldorf-Bilk', postalCode: '' });
    expect(parsed.intent.explicitLocation).toBe('');
    expect(parsed.intent.openQuestions.map((q) => q.field)).toEqual(['ort', 'ziel']);
    expect(unansweredQuestions(parsed.intent, {})).toHaveLength(2);
  });

  it('nutzt einen ausdrücklich genannten anderen Ort statt des Profilstadtteils', () => {
    const resolved = resolveApplicationInput({
      title: 'Geruch an der Haltestelle', ownText: 'An der Haltestelle Rath Mitte riecht es nach Urin.', procedureId: 'anregung-24',
      answers: {}, name: '', profileLocation: 'Düsseldorf-Bilk', location: 'Düsseldorf-Bilk', postalCode: '', intent: intent({
        issue: 'Uringeruch an der Haltestelle Rath Mitte', goal: 'Reinigung veranlassen', explicitLocation: 'Rath Mitte', needsExactLocation: false,
        openQuestions: [],
      }),
    });
    expect(resolved.location).toBe('Rath Mitte, Düsseldorf');
    expect(resolved.locationSource).toBe('user');
  });

  it('übernimmt Profilort automatisch und löst beantwortete Rückfragen auf', () => {
    const unresolved = intent({ goal: '', openQuestions: [
      { field: 'ort', question: 'Welche Straße?', reason: 'Damit die Stelle auffindbar ist.' },
      { field: 'ziel', question: 'Was soll passieren?', reason: 'Eine konkrete Bitte fehlt.' },
    ] });
    const resolved = resolveApplicationInput({
      title: 'Sicherer Übergang', ownText: 'An meiner Straße fehlt ein Übergang.', procedureId: 'anregung-24', answers: { ort: 'Musterstraße', ziel: 'Einen sicheren Übergang prüfen' },
      name: '', profileLocation: 'Düsseldorf-Bilk', location: 'Düsseldorf-Bilk', postalCode: '', intent: unresolved,
    });
    expect(resolved.location).toBe('Musterstraße, Düsseldorf');
    expect(resolved.intent?.goal).toBe('Einen sicheren Übergang prüfen');
    expect(unansweredQuestions(resolved.intent, resolved.answers)).toEqual([]);
  });
});
