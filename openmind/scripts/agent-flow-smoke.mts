import { createRequire } from 'node:module';
import { extractIntent, resolveApplicationInput, unansweredQuestions } from '@/core/research/intent';
import { runApplication } from '@/core/research/pipeline';
import { inspectDraftQuality } from '@/core/research/alignment';
import type { ApplicationInput } from '@/core/research/types';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env') as { loadEnvConfig: (cwd: string) => unknown };
loadEnvConfig(process.cwd());
if (process.env.AGENT_SMOKE_TRACE === '1') {
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const response = await realFetch(input, init);
    if (String(input).endsWith('/api/chat')) {
      const request = JSON.parse(String(init?.body));
      const system = String(request.messages?.[0]?.content || '');
      if (/Ethics Guardian|Verfasse eine (?:konkrete|zusammenhängende)|Ermittle die für das konkrete|Recherchiere nur zu dem konkreten/.test(system)) {
        const output = await response.clone().json().catch(() => ({}));
        const stage = /Ethics Guardian/.test(system) ? 'guardian' : /Verfasse eine (?:konkrete|zusammenhängende)/.test(system) ? 'draft'
          : /Ermittle die für das konkrete/.test(system) ? 'routing' : 'research';
        console.log(`\n[${stage}] ${output.model || ''}\n${String(output.message?.content || '').slice(0, 2600)}\n`);
      }
    }
    return response;
  };
}

const profileLocation = process.env.AGENT_SMOKE_LOCATION || 'Düsseldorf-Bilk';
const cases = [
  {
    title: 'Schulweg',
    text: 'An der Kreuzung Bilker Allee/Merowingerstraße fehlt ein sicherer Übergang zum Schulweg. Ich wünsche mir, dass die Stadt einen Zebrastreifen oder eine Ampel prüft.',
    problem: /sicher(?:er|en|e).{0,50}(?:übergang|querung)|(?:übergang|querung).{0,50}sicher/i,
    goal: /zebrastreifen|ampel|querung|übergang/i,
  },
  {
    title: 'Haltestelle',
    text: 'An der Haltestelle Rath Mitte in Düsseldorf riecht es regelmäßig nach Urin. Ich wünsche mir häufigere Reinigung und eine Prüfung der Ursache.',
    problem: /urin|geruch/i,
    goal: /reinig|ursache/i,
  },
  {
    title: 'Mülleimer',
    text: 'Im Volksgarten sind die Mülleimer oft voll. Ich wünsche mir häufigere Leerungen.',
    problem: /mülleimer|muelleimer/i,
    goal: /leer/i,
  },
];
const preparedIntents: Record<string, NonNullable<ApplicationInput['intent']>> = {
  Mülleimer: {
    summary: 'Die Mülleimer im Volksgarten sind oft voll; häufigere Leerungen werden gewünscht.',
    issue: 'Im Volksgarten sind die Mülleimer oft voll.',
    goal: 'Mülleimer häufiger leeren',
    explicitLocation: 'Volksgarten',
    affected: '',
    confirmedDetails: [],
    needsExactLocation: false,
    openQuestions: [],
    searchTerms: ['Volksgarten Düsseldorf Mülleimer häufig voll', 'Düsseldorf Abfallbehälter Leerung zuständige Stelle', 'Volksgarten Reinigung Kontakt'],
  },
};

async function main() {
  if (process.env.AGENT_SMOKE_SKIP_INCOMPLETE !== '1') {
    const incomplete = await extractIntent({ originalText: 'An meiner Straße fehlt ein sicherer Übergang.', title: 'Sicherer Übergang', profileLocation, postalCode: '' });
    if (!incomplete.intent.openQuestions.some((question) => question.field === 'ort')) {
      throw new Error('Unvollständige Eingabe wurde nicht nach Straße/Kreuzung gefragt.');
    }
    console.log(`✓ Unvollständiger Fall fragt nach dem genauen Ort (${incomplete.model}).`);
  }

  for (const item of cases.filter((value) => !process.env.AGENT_SMOKE_CASE || process.env.AGENT_SMOKE_CASE === value.title)) {
    const prepared = process.env.AGENT_SMOKE_PREPARED_INTENT === '1' ? preparedIntents[item.title] : undefined;
    const extracted = prepared
      ? { intent: prepared, model: 'prepared-smoke-intent' }
      : await extractIntent({ originalText: item.text, title: item.title, profileLocation, postalCode: '' });
    if (!extracted.intent.goal.trim()) throw new Error(`${item.title}: Der ausdrücklich genannte Wunsch wurde nicht erkannt.`);
    const input: ApplicationInput = resolveApplicationInput({
      title: extracted.intent.issue, ownText: item.text, answers: {
        ...(extracted.intent.explicitLocation ? { ort: extracted.intent.explicitLocation } : {}),
        ...(extracted.intent.goal ? { ziel: extracted.intent.goal } : {}),
        ...(extracted.intent.affected ? { betroffen: extracted.intent.affected } : {}),
        ...(extracted.intent.confirmedDetails.length ? { details: extracted.intent.confirmedDetails.join('\n') } : {}),
      },
      procedureId: 'anregung-24', name: '', profileLocation, location: profileLocation, locationSource: 'profile', postalCode: '',
      intent: extracted.intent, intentModel: extracted.model,
    });
    const missing = unansweredQuestions(input.intent, input.answers);
    if (missing.length) throw new Error(`${item.title}: unerwartete Rückfrage: ${missing.map((question) => question.question).join(' ')}`);
    const events: string[] = [];
    const result = await runApplication(input, (event) => { if (event.status === 'done') events.push(`${event.id}:${event.model}`); });
    const subjectAndBody = result.draft.subject + '\n' + result.draft.body;
    if (!item.problem.test(subjectAndBody) || !item.goal.test(subjectAndBody)) {
      throw new Error(`${item.title}: Betreff/Entwurf greift Problem oder Wunsch nicht auf.\n${subjectAndBody}`);
    }
    const quality = inspectDraftQuality(result.draft.body, item.text);
    if (quality.repetitive || quality.quotedOriginal || quality.fieldLabels || quality.unnaturalFormulation
      || /Meine Schilderung|Ich wünsche mir|Mein Wunsch/i.test(result.draft.body) || result.draft.body.includes(item.text)) {
      throw new Error(`${item.title}: Der Entwurf enthält Wiederholungen, Feldbezeichnungen oder ein Originalzitat.\n${result.draft.body}`);
    }
    if (!result.guardian.alignment.addressesProblem || !result.guardian.alignment.includesDesiredChange
      || !result.guardian.alignment.preservesUserPosition || result.guardian.alignment.inventedUserDetails.length
      || result.guardian.quality.repetitive || result.guardian.quality.quotedOriginal || result.guardian.quality.fieldLabels || result.guardian.quality.unnaturalFormulation) {
      throw new Error(`${item.title}: Guardian hat eine Abweichung von der Nutzerabsicht erkannt.\n${JSON.stringify({ draft: result.draft, guardian: result.guardian }, null, 2)}`);
    }
    console.log(`✓ ${item.title} · ${result.model} · ${result.sources.length} Quellen · ${result.location}`);
    console.log(`  Betreff: ${result.draft.subject}`);
    console.log(`  ${events.join(' → ')}`);
    console.log(`  ${result.draft.body.replace(/\s+/g, ' ').slice(0, 420)}${result.draft.body.length > 420 ? '…' : ''}`);
  }
  // This script only uses Ollama and SearXNG. It has no Gmail/OAuth/send imports.
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
