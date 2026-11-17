import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn(async () => [{ address: '93.184.215.14', family: 4 }]) }));
import { lookup } from 'node:dns/promises';
import { publicUrl, readPublicPage, verifyRecipient, runSearches } from '@/core/research/web';
import { runApplication } from '@/core/research/pipeline';
import { inspectDraftQuality } from '@/core/research/alignment';
import { original, result } from '../fixtures/application';
import type { ApplicationInput } from '@/core/research/types';
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
function webReply() { return new Response('<p>Hinweise zur Sauberkeit: <a href="mailto:reinigung@station.example.org">E-Mail</a></p><a href="https://station.example.org/formular">Formular</a>', { headers: { 'content-type': 'text/html' } }); }
describe('Recherche und Kontaktbelege', () => {
  it('akzeptiert natürliche Problem- und Bitte-Absätze und erkennt Qualitätsfehler', () => {
    const originalText = 'Am S-Bahnhof Rath Mitte ist es häufig schmutzig und es riecht stark nach Urin. Bitte veranlassen Sie eine Reinigung.';
    const natural = 'Sehr geehrte Damen und Herren,\n\nAm S-Bahnhof Rath Mitte riecht es häufig nach Urin. Bitte veranlassen Sie eine Reinigung und prüfen Sie die Ursache.\n\nMit freundlichen Grüßen';
    const duplicate = 'An der Haltestelle Rath Mitte riecht es regelmäßig nach Urin und die Umgebung ist stark verschmutzt. An der Haltestelle Rath Mitte riecht es regelmäßig nach Urin und die Umgebung ist stark verschmutzt.';
    expect(inspectDraftQuality(natural, originalText)).toEqual({ repetitive: false, quotedOriginal: false, fieldLabels: false, unnaturalFormulation: false });
    expect(inspectDraftQuality(duplicate, 'Ein anderer Text ohne passenden Bezug.')).toMatchObject({ repetitive: true });
    expect(inspectDraftQuality('„Am S-Bahnhof Rath Mitte ist es häufig schmutzig und es riecht stark nach Urin. Bitte veranlassen Sie eine Reinigung.“', originalText)).toMatchObject({ quotedOriginal: true });
    expect(inspectDraftQuality('Meine Schilderung: Am Bahnhof riecht es nach Urin.', '')).toMatchObject({ fieldLabels: true });
    expect(inspectDraftQuality('Ich möchte auf folgende Situation aufmerksam machen: Es riecht nach Urin.', '')).toMatchObject({ unnaturalFormulation: true });
  });
  it.each(['http://localhost/a', 'http://127.0.0.1', 'http://[::1]', 'file:///etc/passwd', 'https://user:pass@example.org', 'https://example.org:9000'])('verwirft interne/ungeeignete URL %s', (url) => expect(publicUrl(url)).toBeNull());
  it('verwirft auch private DNS-Ziele und umgeleitete interne Seiten', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: '192.168.1.1', family: 4 }] as never);
    await expect(readPublicPage('https://station.example.org')).rejects.toThrow('Interne');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } })));
    await expect(readPublicPage('https://station.example.org')).rejects.toThrow('öffentliche');
  });
  it('prüft Adresse auf der Quellseite; ein Suchsnippet reicht nicht', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => webReply()));
    await expect(verifyRecipient('reinigung@station.example.org', result.sources[0].url, result.sources)).resolves.toMatchObject({ email: 'reinigung@station.example.org' });
    await expect(verifyRecipient('falsch@station.example.org', result.sources[0].url, result.sources)).rejects.toThrow('steht nicht');
    await expect(verifyRecipient('reinigung@station.example.org', 'https://other.example.org', result.sources)).rejects.toThrow('Kontaktquelle');
  });
  it('zeigt SearXNG-Ausfälle, ohne Beispielquellen zu erfinden', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    await expect(runSearches(['Rath Mitte'])).rejects.toThrow('SearXNG');
  });
  it('durchläuft sechs Agentenschritte mit gespeichertem Profilort, ohne Versand', async () => {
    const answers = [result.research, result.routing, result.draft, result.guardian, result.participationReview];
    const calls: string[] = []; let i = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).includes('/api/chat')) {
        const body = JSON.parse(String(init?.body));
        expect(body.messages[1].content).toContain('Rath Mitte');
        return Response.json({ model: result.model, message: { content: JSON.stringify(answers[i++]) } });
      }
      if (String(url).includes('/search?')) return Response.json({ results: result.sources.map((s) => ({ title: s.title, url: s.url, content: s.snippet })) });
      if (String(url).startsWith('https://station.example.org')) return webReply();
      throw new Error('Unexpected network');
    }));
    const events: string[] = [];
    const r = await runApplication(original, (e) => { if (e.status === 'done') events.push(e.id); });
    expect(events).toEqual(['intake', 'research', 'routing', 'draft', 'guardian', 'relevance']);
    expect(r.routing.method).toBe('email'); expect(r.guardian.pass).toBe(true);
    expect(calls.some((u) => u.includes('gmail'))).toBe(false);
    expect(calls.filter((u) => u.includes('/search?')).every((u) => new URL(u).searchParams.get('q')?.includes(original.location))).toBe(true);
  });

  it.each([
    {
      ownText: 'An meiner Straße fehlt ein sicherer Übergang zur Schule. Ich wünsche mir, dass die Stadt sichere Querungsmöglichkeiten prüft.',
      issue: 'An der Straße fehlt ein sicherer Übergang zur Schule', goal: 'Sichere Querungsmöglichkeiten für den Schulweg prüfen', place: 'Bilker Allee / Merowingerstraße',
      details: ['Die Stelle liegt auf einem Schulweg.'], expected: ['sicherer Übergang', 'Querungsmöglichkeiten'],
      generatedSubject: 'Sicherer Übergang zur Schule an der Bilker Allee',
      generatedBody: 'Sehr geehrte Damen und Herren,\n\nAn der Bilker Allee fehlt ein sicherer Übergang zur Schule. Bitte prüfen Sie, ob sich dort sichere Querungsmöglichkeiten für den Schulweg einrichten lassen. Über eine Rückmeldung würde ich mich freuen.\n\nMit freundlichen Grüßen',
    },
    {
      ownText: 'An der Haltestelle Rath Mitte riecht es regelmäßig nach Urin. Bitte häufigere Reinigung und Prüfung der Ursache.',
      issue: 'Regelmäßiger Uringeruch an der Haltestelle Rath Mitte', goal: 'Häufigere Reinigung und Prüfung der Ursache', place: 'Haltestelle Rath Mitte',
      details: ['Die Person nimmt den Geruch regelmäßig wahr.'], expected: ['nach Urin', 'Häufigere Reinigung', 'Ursache'],
      generatedSubject: 'Bitte um Reinigung an der Haltestelle Rath Mitte',
      generatedBody: 'Sehr geehrte Damen und Herren,\n\nAn der Haltestelle Rath Mitte riecht es regelmäßig nach Urin. Bitte veranlassen Sie eine häufigere Reinigung und prüfen Sie die Ursache. Über eine Rückmeldung würde ich mich freuen.\n\nMit freundlichen Grüßen',
    },
    {
      ownText: 'Im Volksgarten sind die Mülleimer oft voll. Ich wünsche mir häufigere Leerungen.',
      issue: 'Oft volle Mülleimer im Volksgarten', goal: 'Mülleimer häufiger leeren', place: 'Volksgarten',
      details: ['Die Mülleimer sind laut Nutzerangabe oft voll.'], expected: ['Mülleimer', 'häufiger leeren'],
      generatedSubject: 'Bitte um häufigere Leerung der Mülleimer im Volksgarten',
      generatedBody: 'Sehr geehrte Damen und Herren,\n\nIm Volksgarten sind die Mülleimer oft voll. Bitte lassen Sie die Mülleimer häufiger leeren. Über eine Rückmeldung würde ich mich freuen.\n\nMit freundlichen Grüßen',
    },
  ])('hält Problem, Wunsch, Profilort und Details bis zum konkreten Mailentwurf zusammen: $issue', async (example) => {
    const scenario: ApplicationInput = {
      ...original, title: example.issue, ownText: example.ownText,
      profileLocation: 'Düsseldorf-Bilk', location: 'Düsseldorf-Bilk', locationSource: 'profile',
      answers: { ort: example.place, ziel: example.goal },
      intent: { ...result.intake, issue: example.issue, goal: example.goal, explicitLocation: '', affected: '',
        confirmedDetails: example.details, needsExactLocation: true, openQuestions: [], searchTerms: [`${example.issue} Kontakt`, `${example.issue} zuständige Stelle`, `${example.issue} Rechtsgrundlage`] },
      intentModel: 'qwen3:8b',
    };
    const generatedBody = example.generatedBody;
    const generatedSubject = example.generatedSubject;
    const modelAnswers = [
      result.research,
      { ...result.routing, recommendation: `Bitte prüfen: ${example.goal}.`, recommendationSourceIds: [1] },
      { ...result.draft, subject: generatedSubject, body: generatedBody },
      { ...result.guardian, alignment: { addressesProblem: true, includesDesiredChange: true, preservesUserPosition: true, inventedUserDetails: [] } },
      result.participationReview,
    ];
    const modelInputs: { system: string; user: string }[] = []; let modelIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/chat')) {
        const request = JSON.parse(String(init?.body));
        modelInputs.push({ system: request.messages[0].content, user: request.messages[1].content });
        return Response.json({ model: result.model, message: { content: JSON.stringify(modelAnswers[modelIndex++]) } });
      }
      if (String(url).includes('/search?')) return Response.json({ results: result.sources.map((s) => ({ title: s.title, url: s.url, content: s.snippet })) });
      if (String(url).startsWith('https://station.example.org')) return webReply();
      throw new Error('Unexpected network');
    }));
    const output = await runApplication(scenario, () => {});
    expect(output.draft.subject).toBe(example.generatedSubject);
    for (const term of example.expected) expect(output.draft.body.toLocaleLowerCase('de-DE')).toContain(term.toLocaleLowerCase('de-DE'));
    expect(modelInputs).toHaveLength(5);
    const draftInput = JSON.parse(modelInputs[2].user);
    expect(draftInput.userIntent.originalText).toBe(example.ownText);
    expect(draftInput.userIntent.problem).toBe(example.issue);
    expect(draftInput.userIntent.desiredChange).toBe(example.goal);
    expect(draftInput.userIntent.effectiveLocation).toContain(example.place);
    expect(draftInput.userIntent.confirmedDetails).toEqual(example.details);
    expect(modelInputs[2].system).toContain('zusammenhängende, professionelle und natürlich klingende E-Mail');
    expect(modelInputs[2].system).toContain('Zitiere oder kopiere den Originaltext nicht');
    expect(modelInputs[2].system).toContain('konkrete Bitte');
    expect(output.draft.body).not.toContain(example.ownText);
    expect(output.draft.body).not.toMatch(/Meine Schilderung|Ich wünsche mir|Mein Wunsch/i);
    expect(output.guardian.quality).toMatchObject({ repetitive: false, quotedOriginal: false, fieldLabels: false, unnaturalFormulation: false });
  });

  it('revidiert einen allgemeinen Entwurf, bevor er zurückgegeben wird', async () => {
    const vague = { ...result.draft, subject: 'Informationen zum Verkehr', body: 'Verkehrssicherheit ist in Städten wichtig. Viele Menschen nutzen Straßen und öffentliche Verkehrsmittel. Die Zuständigkeit hängt vom Ort ab.' };
    const corrected = { ...result.draft, subject: 'Sicherer Übergang zur Schule an der Musterstraße', body: 'Sehr geehrte Damen und Herren, an der Musterstraße fehlt ein sicherer Übergang zur Schule. Bitte prüfen Sie, ob ein sicherer Übergang eingerichtet werden kann. Bitte geben Sie mir Rückmeldung. Mit freundlichen Grüßen' };
    const failed = { ...result.guardian, pass: false, concerns: ['Der Entwurf greift das konkrete Anliegen nicht auf.'], alignment: { addressesProblem: false, includesDesiredChange: false, preservesUserPosition: true, inventedUserDetails: [] } };
    const modelAnswers = [result.research, result.routing, vague, failed, corrected, result.guardian, result.participationReview]; let i = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/chat')) return Response.json({ model: result.model, message: { content: JSON.stringify(modelAnswers[i++]) } });
      if (String(url).includes('/search?')) return Response.json({ results: result.sources.map((s) => ({ title: s.title, url: s.url, content: s.snippet })) });
      if (String(url).startsWith('https://station.example.org')) return webReply();
      throw new Error('Unexpected network');
    }));
    const output = await runApplication({ ...original, ownText: 'An der Musterstraße fehlt ein sicherer Übergang zur Schule.',
      answers: { ort: 'Musterstraße', ziel: 'Sicheren Übergang zur Schule prüfen' },
      intent: { ...result.intake, issue: 'Sicherer Übergang zur Schule an der Musterstraße', goal: 'Sicheren Übergang zur Schule prüfen', explicitLocation: '', needsExactLocation: true, openQuestions: [] } }, () => {});
    expect(output.draft.body).toBe(corrected.body);
    expect(i).toBe(7);
  });

  it('ersetzt einen trotz falschem Guardian-Pass allgemeinen Entwurf durch eine Vorlage aus Nutzereingaben', async () => {
    const ownText = 'An der Haltestelle Rath Mitte riecht es regelmäßig nach Urin. Ich wünsche mir häufigere Reinigung und eine Prüfung der Ursache.';
    const intent = { ...result.intake, issue: 'Regelmäßiger Uringeruch an der Haltestelle Rath Mitte', goal: 'Häufigere Reinigung und Prüfung der Ursache', explicitLocation: 'Rath Mitte', confirmedDetails: ['Der Geruch wird regelmäßig wahrgenommen.'], openQuestions: [] };
    const vague = { ...result.draft, subject: 'Verkehr und Sauberkeit in Düsseldorf', body: 'Sauberkeit ist für die Aufenthaltsqualität an Haltestellen wichtig. Zuständig können je nach Ort unterschiedliche Stellen sein. Die Haltestelle wird vom Verkehrsverbund Rhein-Ruhr (VRS) betreut. Bitte informieren Sie sich auf den jeweiligen Webseiten.' };
    const dishonestPass = { ...result.guardian, pass: true, quality: { repetitive: true, quotedOriginal: true, fieldLabels: true, unnaturalFormulation: true }, alignment: { addressesProblem: true, includesDesiredChange: true, preservesUserPosition: true, inventedUserDetails: [] } };
    const answers = [result.research, result.routing, vague, dishonestPass, vague, dishonestPass, result.guardian, result.participationReview]; let i = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('/api/chat')) return Response.json({ model: result.model, message: { content: JSON.stringify(answers[i++]) } });
      if (String(url).includes('/search?')) return Response.json({ results: result.sources.map((s) => ({ title: s.title, url: s.url, content: s.snippet })) });
      if (String(url).startsWith('https://station.example.org')) return webReply();
      throw new Error('Unexpected network');
    }));
    const output = await runApplication({ ...original, ownText, title: intent.issue, answers: { ort: 'Rath Mitte', ziel: intent.goal }, intent }, () => {});
    expect(output.draft.subject).toContain(intent.issue);
    expect(output.draft.body).toContain('Haltestelle Rath Mitte');
    expect(output.draft.body).toMatch(/reinig/i);
    expect(output.draft.body).toContain('Ursache');
    expect(output.draft.body).not.toContain(ownText);
    expect(output.draft.body).not.toMatch(/Meine Schilderung|Ich wünsche mir|Mein Wunsch/i);
    expect(output.draft.body).not.toContain('Aufenthaltsqualität');
    expect(output.draft.body).not.toContain('Verkehrsverbund Rhein-Ruhr');
    expect(output.guardian.pass).toBe(true);
    expect(output.guardian.alignment).toMatchObject({ addressesProblem: true, includesDesiredChange: true, preservesUserPosition: true, inventedUserDetails: [] });
    expect(output.guardian.quality).toMatchObject({ repetitive: false, quotedOriginal: false, fieldLabels: false, unnaturalFormulation: false });
    expect(i).toBe(8);
  });

  it('stoppt bei fehlender Straße und fehlendem Wunsch, ohne Suchanfrage oder Entwurf', async () => {
    const incomplete: ApplicationInput = { ...original, ownText: 'An meiner Straße fehlt ein sicherer Übergang.', profileLocation: 'Düsseldorf-Bilk', location: 'Düsseldorf-Bilk', answers: {},
      intent: { ...result.intake, issue: 'Fehlender sicherer Übergang an einer Straße', goal: '', explicitLocation: '', confirmedDetails: [], needsExactLocation: true, openQuestions: [] } };
    const network = vi.fn(); vi.stubGlobal('fetch', network);
    await expect(runApplication(incomplete, () => {})).rejects.toThrow(/Welche Straße|Was soll die zuständige Stelle/);
    expect(network).not.toHaveBeenCalled();
  });
});

