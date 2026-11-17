import { callStructured } from '@/core/ai/json';
import { HttpError } from '@/core/http/safeRoute';
import { intakeSchema, type ApplicationInput, type UserIntent } from './types';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function exactUserPlace(rawText: string, candidate: string) {
  const place = candidate.trim();
  if (!place || !normalize(rawText).includes(normalize(place))) return '';
  return place;
}

function isSpecificPlace(place: string) {
  const value = normalize(place);
  if (!value) return false;
  return !/^(hier|bei mir|in meiner naehe|in der naehe|an meiner strasse|auf meiner strasse|meine strasse|unserer strasse|am bahnhof|bei der haltestelle|in meinem stadtteil)$/.test(value);
}

function textHasVaguePlace(rawText: string) {
  return /\b(?:an|auf|in)\s+(?:meiner|unserer|meinem|unserem)\s+(?:stra(?:ß|ss)e|kreuzung|gegend|nähe|naehe)\b|\b(?:hier|bei mir|in meiner nähe|in meiner naehe|in der nähe|in der naehe)\b/i.test(rawText);
}

function withCity(place: string, profileLocation: string, postalCode: string) {
  const profile = profileLocation.trim();
  const postal = postalCode.trim();
  if (!place) return profile || postal;
  if (!profile) return postal ? `${place}, ${postal}` : place;
  let city = profile.split(/[·,]/)[0].trim();
  city = city.replace(/\s*[-–—]\s*[^–—-]+$/, '').trim();
  if (!city || normalize(place).includes(normalize(city))) return place;
  return `${place}, ${city}`;
}

function ensureQuestion(questions: UserIntent['openQuestions'], field: 'ort' | 'ziel', question: string, reason: string) {
  if (questions.some((item) => item.field === field)) return questions;
  return [...questions, { field, question, reason }];
}

export function normalizeIntent(intent: UserIntent, rawText: string, answers: Record<string, string> = {}): UserIntent {
  const explicitFromUser = answers.ort?.trim();
  const extracted = exactUserPlace(rawText, intent.explicitLocation);
  const explicitLocation = explicitFromUser || (isSpecificPlace(extracted) ? extracted : '');
  let openQuestions = [...intent.openQuestions];
  if ((intent.needsExactLocation || textHasVaguePlace(rawText)) && !explicitLocation) {
    openQuestions = ensureQuestion(openQuestions, 'ort', 'Welche Straße, Kreuzung oder konkrete Haltestelle meinst du?', 'Die Stelle muss für die zuständige Stelle eindeutig auffindbar sein.');
  }
  if (!(answers.ziel?.trim() || intent.goal.trim())) {
    openQuestions = ensureQuestion(openQuestions, 'ziel', 'Was soll die zuständige Stelle konkret prüfen oder ändern?', 'Dein gewünschtes Ergebnis ist noch nicht klar genug für eine konkrete Bitte.');
  }
  openQuestions = openQuestions.filter((item) => {
    if (answers[item.field]?.trim()) return false;
    if (item.field === 'ziel' && (answers.ziel?.trim() || intent.goal.trim())) return false;
    if (item.field === 'ort' && explicitLocation) return false;
    if (item.field === 'betroffen' && (answers.betroffen?.trim() || intent.affected.trim())) return false;
    return true;
  });
  return {
    ...intent,
    issue: answers.problem?.trim() || intent.issue,
    goal: answers.ziel?.trim() || intent.goal,
    explicitLocation,
    affected: answers.betroffen?.trim() || intent.affected,
    confirmedDetails: answers.details !== undefined
      ? answers.details.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12)
      : intent.confirmedDetails,
    openQuestions,
  };
}

export function resolveApplicationInput(input: ApplicationInput): ApplicationInput {
  const profileLocation = input.profileLocation?.trim() || '';
  if (!input.intent) return { ...input, location: profileLocation || input.location || input.postalCode, locationSource: 'profile' };
  const intent = normalizeIntent(input.intent, input.ownText, input.answers);
  const place = input.answers.ort?.trim() || intent.explicitLocation;
  const location = withCity(place, profileLocation, input.postalCode);
  return {
    ...input,
    title: input.answers.problem?.trim() || intent.issue || input.title,
    location: location || profileLocation || input.postalCode,
    locationSource: place ? 'user' : 'profile',
    intent,
  };
}

export function unansweredQuestions(intent: UserIntent | undefined, answers: Record<string, string>) {
  return (intent?.openQuestions || []).filter((item) => !answers[item.field]?.trim());
}

export async function extractIntent(input: { originalText: string; title: string; profileLocation: string; postalCode: string; topicTitle?: string }, signal?: AbortSignal) {
  const result = await callStructured({
    system: [
      'Du bist Kims Agent zum Verstehen eines kommunalen oder politischen Anliegens. Antworte auf Deutsch.',
      'Der Originaltext ist die einzige Quelle für persönliche Beobachtungen, Betroffenheit und die Haltung der Person. Erfinde nichts und formuliere keine Position für die Person.',
      'Gib issue als kurze, grammatisch vollständige und natürliche Problembeschreibung aus, nicht als Überschrift oder Stichwort. Gib goal davon getrennt als konkrete gewünschte Handlung oder Veränderung aus. Wiederhole im goal nicht die Problembeschreibung. Wenn die gewünschte Handlung nicht klar folgt, lasse goal leer und stelle eine gezielte Frage dazu.',
      'Korrigiere offensichtliche Rechtschreibfehler und umgangssprachliche Ortsbezeichnungen nur, wenn die beabsichtigte Bedeutung eindeutig ist. Erhalte Häufigkeiten und andere Einzelheiten nur, wenn sie im Originaltext stehen.',
      'explicitLocation muss eine kurze Ortsangabe sein, die wörtlich im Originaltext vorkommt. Verwende niemals den Profilort als expliziten Nutzerort. Wenn nur „meine Straße“, „hier“ oder „in der Nähe“ genannt ist, ist needsExactLocation=true.',
      'confirmedDetails dürfen nur Angaben aus dem Originaltext enthalten. Zielgruppen nur nennen, wenn der Text sie erwähnt. Offene Fragen nur stellen, wenn eine Antwort die Zuständigkeit oder eine konkrete Bitte wesentlich verändert. Höchstens drei kurze Fragen.',
      'searchTerms sollen gezielte Suchbegriffe für zuständige Stelle, Kontaktweg und einschlägige Rechtsgrundlagen sein. Keine Namen, E-Mail-Adressen oder persönlichen Daten suchen.',
    ].join('\n'),
    user: JSON.stringify(input),
    schema: intakeSchema,
    maxTokens: 650,
    signal,
  });
  const value = normalizeIntent(result.value, input.originalText);
  if (!value.issue.trim()) throw new HttpError(422, 'Das Anliegen konnte noch nicht verstanden werden. Formuliere bitte kurz, was nicht stimmt.');
  return { intent: value, model: result.model };
}
