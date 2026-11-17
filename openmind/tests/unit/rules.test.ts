import { describe, expect, it, vi } from 'vitest';
vi.mock('@/core/auth', () => ({ requireUser: async () => ({ id: 'rules-user' }) }));
import { ruleGuardian, ruleNeutralRewrite, ruleNeutrality } from '@/lib/rules';
import { POST as agentRoute } from '@/app/api/agents/[name]/route';

const route = (name: string) => (req: Request) => agentRoute(req, { params: Promise.resolve({ name }) });
const guardianRoute = route('guardian');
const neutralityRoute = route('neutrality');

const post = (body: unknown) => new Request('http://localhost:3000', { method: 'POST', headers: { origin: 'http://localhost:3000' }, body: JSON.stringify(body) });

describe('Ethics Guardian', () => {
  it('blockiert „Du solltest dafür stimmen“', () => {
    const r = ruleGuardian('Du solltest dafür stimmen');
    expect(r.pass).toBe(false);
    expect(r.issues[0].type).toBe('empfehlung');
  });

  it('blockiert auch über den Endpoint, unabhängig vom API-Key', async () => {
    process.env.OLLAMA_ENABLED = 'false';
    const r = await (await guardianRoute(post({ text: 'Du solltest dafür stimmen' }))).json();
    expect(r.pass).toBe(false);
  });

  it.each(['Ich empfehle, dagegen zu stimmen.', 'Ihr solltet unterschreiben.', 'Meine Empfehlung: Ja.'])('erkennt Empfehlung: %s', (t) => {
    expect(ruleGuardian(t).pass).toBe(false);
  });

  it('lässt neutrale, beidseitige Aussagen durch', () => {
    expect(ruleGuardian('Befürworter*innen nennen mehr Sicherheit, Kritiker*innen den Wegfall von 120 Parkplätzen.').pass).toBe(true);
  });
});

describe('Neutralitäts-Check', () => {
  const sentence = 'Bist du auch gegen die unsinnigen Radwege?';

  it('markiert wertende und suggestive Stellen', () => {
    const issues = ruleNeutrality(sentence).map((i) => i.original);
    expect(issues).toContain('unsinnigen');
    expect(issues).toContain('auch gegen');
  });

  it('schlägt die neutrale Alternative vor', () => {
    expect(ruleNeutralRewrite(sentence)).toBe('Wie bewertest du die geplanten Radwege?');
  });

  it('liefert das über den Endpoint ohne API-Key', async () => {
    process.env.OLLAMA_ENABLED = 'false';
    const r = await (await neutralityRoute(post({ text: sentence }))).json();
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.neutralVersion).toBe('Wie bewertest du die geplanten Radwege?');
  });

  it('lässt neutrale Fragen unverändert', () => {
    expect(ruleNeutrality('Wie bewertest du die geplanten Radwege?')).toHaveLength(0);
  });
});
