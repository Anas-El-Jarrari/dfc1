import type { ApplicationInput, ApplicationResult } from '@/core/research/types';
export const original: ApplicationInput = {
  title: 'Uringeruch an der S-Bahn-Haltestelle Rath Mitte',
  ownText: 'An der Haltestelle Düsseldorf Rath Mitte riecht es nach meiner Beobachtung regelmäßig nach Urin. Ich möchte eine Reinigung und Prüfung der Ursache.',
  answers: { ort: 'Düsseldorf Rath Mitte S', betroffen: 'Fahrgäste', ziel: 'Reinigung und Prüfung der Ursache' },
  name: 'Mira', procedureId: 'anregung-24', profileLocation: 'Düsseldorf-Bilk', location: 'Düsseldorf Rath Mitte S', locationSource: 'user', postalCode: '',
  intent: { summary: 'Regelmäßiger Uringeruch an der Haltestelle Rath Mitte; Reinigung und Ursachenprüfung gewünscht.',
    issue: 'Regelmäßiger Uringeruch an der Haltestelle Düsseldorf Rath Mitte', goal: 'Reinigung und Prüfung der Ursache', explicitLocation: 'Düsseldorf Rath Mitte', affected: 'Fahrgäste',
    confirmedDetails: ['Die Person nimmt den Geruch regelmäßig wahr.'], needsExactLocation: false, openQuestions: [],
    searchTerms: ['Düsseldorf Rath Mitte Haltestelle Sauberkeit Betreiber Kontakt', 'Düsseldorf Rath Mitte Reinigung zuständig', 'Bahnhof Sauberkeit Rechtsgrundlage'] },
  intentModel: 'qwen3:8b',
};
// These fixtures are never used by the application. All pages and email delivery are mocked.
export const result: ApplicationResult = {
  location: original.location, model: 'qwen3:8b', checkedAt: '2026-11-17T12:00:00.000Z',
  intake: { summary: original.intent!.summary, issue: original.intent!.issue, goal: original.intent!.goal, explicitLocation: original.intent!.explicitLocation,
    affected: original.intent!.affected, confirmedDetails: original.intent!.confirmedDetails, needsExactLocation: false, openQuestions: [],
    searchTerms: original.intent!.searchTerms },
  research: { summary: 'Betreiberkontakt gefunden', findings: [{ claim: 'Der Betreiber nimmt Hinweise zur Sauberkeit an.', sourceIds: [1] }], unknowns: ['Der Geruch ist eine Nutzerbeobachtung.'], searchTerms: ['Bahnhof Reinigung Kontakt'] },
  sources: [{ id: 1, title: 'Betreiber · Kontakt zur Sauberkeit (Testquelle)', url: 'https://station.example.org/kontakt',
    snippet: 'Hinweise zur Sauberkeit: reinigung@station.example.org.', text: 'Hinweise zur Sauberkeit: reinigung@station.example.org.',
    emails: ['reinigung@station.example.org', 'service@station.example.org'], links: ['https://station.example.org/formular'], checkedAt: '2026-11-17T12:00:00.000Z' }],
  routing: { office: { name: 'Bahnhofsmanagement', reason: 'Betreiber des Bahnhofs', sourceIds: [1] }, recommendation: 'Bitte um Prüfung und Reinigung.', recommendationSourceIds: [1],
    method: 'email', contacts: [{ kind: 'email', value: 'reinigung@station.example.org', sourceId: 1, purpose: 'Sauberkeit melden' }],
    options: [{ title: 'Sauberkeit melden', description: 'Beobachtung an den Betreiber senden.', tradeoff: 'Die Ursache ist noch unklar.', sourceIds: [1] }],
    laws: [], requirements: [{ title: 'Genaue Stelle', detail: 'Eingang oder Bahnsteig nennen.', required: false, sourceIds: [1] }], verificationNeeded: [] },
  draft: { subject: 'Bitte um Prüfung: Regelmäßiger Uringeruch an der Haltestelle Düsseldorf Rath Mitte', body: 'Sehr geehrte Damen und Herren,\n\nan der Haltestelle Düsseldorf Rath Mitte riecht es regelmäßig nach Urin.\n\nBitte veranlassen Sie eine Reinigung und prüfen Sie die Ursache. Über eine kurze Rückmeldung würde ich mich freuen.\n\nMit freundlichen Grüßen\nMira', counterposition: 'Regelmäßige Reinigung kann erneute Verschmutzung nicht ausschließen.' },
  guardian: { pass: true, concerns: [], unsupportedClaims: [], missingDraftElements: [], counterposition: 'Reinigungen sind Personal- und Kostenfragen.',
    quality: { repetitive: false, quotedOriginal: false, fieldLabels: false, unnaturalFormulation: false },
    alignment: { addressesProblem: true, includesDesiredChange: true, preservesUserPosition: true, inventedUserDetails: [] } },
};

