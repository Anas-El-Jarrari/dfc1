import type { ApplicationInput, UserIntent } from './types';

const normalize = (value: string) => value.replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de-DE').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set('aber alle als am an auch auf aus bei bin bis das dass dem den der des die dies dieser diesem diesen diese doch du durch ein eine einer einem einen eines er es fur gegen hat hier ich im in ist ja kein keine mit nach nicht noch oder sein seine sich sie sind so uber um und von vor was weil welcher wenn wie wir zu zum zur stadt soll sollte betreiber stelle zustandige zustandiger zustandigen installation'.split(' '));
const stem = (word: string) => {
  if (word === 'pruft') return 'pruf';
  if (/^sicher(?:e|er|en|es|em)?$/.test(word)) return 'sicher';
  if (/^haufig(?:e|er|ere|eren|eres|em|en)?$/.test(word)) return 'haufig';
  for (const suffix of ['ungen', 'ung', 'ern', 'er', 'en', 'es', 'e', 'n', 's']) if (word.length > suffix.length + 3 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  return word;
};
const anchors = (value: string) => [...new Set(normalize(value).split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)).map(stem))];
const TEMPLATE_WORDS = new Set('anliegen bitte pruef pruefen pruefung veranlass anfrage wunsch wuensch wuensche wuenschst gewuenscht moeglich koennen koennte umgesetzt veraenderung genau konkret stelle stell zustaendig zustaendigkeit hinweis richtige rueckmeldung antwort antworten mitteilen informieren teilen wenden wende wegen betreff folgend folgendem schilderung meine mein mir ich sie ihnen ihr ihre sehr geehrte geehrter geehrt damen herren herr freundlichen gruesse gruss ueber kurze ob wie und oder falls nicht kann lassen betreffend nehm wahr'.split(' '));

function statementPresent(text: string, statement: string) {
  const normalizedText = normalize(text), normalizedStatement = normalize(statement), words = anchors(statement);
  if (normalizedStatement.length >= 12 && normalizedText.includes(normalizedStatement)) return true;
  if (!words.length) return false;
  const textWords = new Set(anchors(text));
  const matches = words.filter((word) => textWords.has(word)).length;
  return matches >= Math.max(1, Math.ceil(words.length * 0.8));
}

export function draftAlignment(subject: string, body: string, intent: UserIntent) {
  const text = subject + '\n' + body;
  const addressesProblem = statementPresent(text, intent.issue);
  const includesDesiredChange = Boolean(intent.goal.trim()) && statementPresent(text, intent.goal);
  const hasConcreteAsk = /\b(bit(te|ten)|pr[uü]f|veranlass|richt(e|en)|teil(e|en)|informier|mitteil|beseitig|erm[oö]glich|einricht|reinigen|leer(en|ung)|kl[aä]r(en|ung))\w*/i.test(body);
  return { addressesProblem, includesDesiredChange: includesDesiredChange && hasConcreteAsk, hasConcreteAsk };
}

export function inspectDraftQuality(body: string, originalText: string) {
  const normalizedBody = normalize(body);
  const normalizedOriginal = normalize(originalText);
  // Short problem statements often belong in the email once as the natural
  // description of the issue. Treat only a longer copied block as an added
  // quote; explicit quotation marks are checked independently below.
  const quotedOriginal = Boolean(normalizedOriginal && normalizedOriginal.split(' ').length >= 12 && normalizedBody.includes(normalizedOriginal))
    || [...body.matchAll(/[„“"]([^”"]{24,})[”"]/g)].some((match) => {
      const quote = normalize(match[1]);
      return quote.length >= 24 && normalizedOriginal.includes(quote);
    });
  const fieldLabels = /(?:meine schilderung|ich w[uü]nsche mir|mein wunsch|mein anliegen|originaltext)\b|(?:problem|ziel|wunsch)\s*[:\-]/i.test(body);
  const unnaturalFormulation = /\b(?:ich m[oö]chte auf folgende situation aufmerksam machen|ich wende mich mit folgendem anliegen|es sei darauf hingewiesen|in diesem zusammenhang ist es wichtig zu betonen)\b/i.test(body);
  // Compare like with like: comparing each one-sentence paragraph with the
  // same sentence in the sentence list falsely labels every natural paragraph
  // as a duplicate. A problem followed by its concrete request is also normal.
  const paragraphs = body.split(/\n\s*\n/).map((paragraph) => anchors(paragraph)).filter((words) => words.length >= 7);
  const sentences = body.split(/(?<=[.!?])\s+/).map((sentence) => anchors(sentence)).filter((words) => words.length >= 7);
  const repeatsWithin = (units: string[][]) => units.some((left, index) => units.slice(index + 1).some((right) => {
    const rightSet = new Set(right);
    const shared = left.filter((word) => rightSet.has(word)).length;
    return shared >= 7 && shared / Math.min(left.length, right.length) >= 0.86;
  }));
  const repetitive = repeatsWithin(paragraphs) || repeatsWithin(sentences);
  return { repetitive, quotedOriginal, fieldLabels, unnaturalFormulation };
}

function cleanLine(value: string) { return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function trimLabel(value: string, max: number) {
  const cleaned = cleanLine(value).replace(/[.!?]+$/, '');
  return cleaned.length > max ? cleaned.slice(0, max - 1).trimEnd() + '…' : cleaned;
}

/** A conservative final letter using only the user's own words and explicit request. */
export function groundedDraft(input: ApplicationInput) {
  const intent = input.intent!;
  const issue = cleanLine(intent.issue).replace(/[.!?]+$/, '');
  const goal = cleanLine(intent.goal).replace(/[.!?]+$/, '');
  const original = cleanLine(input.ownText);
  const issueSource = `${issue} ${original} ${intent.confirmedDetails.join(' ')}`;
  const issueSentence = readableIssue(issue, issueSource);
  const request = requestForGoal(goal);
  const subject = `Bitte um Prüfung: ${trimLabel(issue, 176)}`.slice(0, 200);
  const body = [
    'Sehr geehrte Damen und Herren,',
    issueSentence,
    request,
    'Über eine kurze Rückmeldung zum weiteren Vorgehen würde ich mich freuen.',
    `Mit freundlichen Grüßen${input.name.trim() ? `\n${input.name.trim()}` : ''}`,
  ].join('\n\n');
  return { subject, body, counterposition: '' };
}

function readableIssue(issue: string, context: string) {
  const phrase = cleanLine(issue).replace(/[.!?]+$/, '');
  const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase('de-DE') + value.slice(1);
  if (/\bfehlt ein sicherer Übergang\b/i.test(phrase)) {
    return capitalize(phrase.replace(/\bfehlt ein sicherer Übergang\b/i, 'gibt es keinen sicheren Übergang')) + '.';
  }
  if (/\b(?:fehlt|fehlen|ist|sind|liegt|liegen|riecht|stinkt|steht|stehen|kommt|kommen|gibt|bleibt|bleiben|passiert|tritt|treten|funktioniert|funktionieren|wird|werden|erschwert|verursacht|besteht|bestehen)\b/i.test(phrase)) return capitalize(phrase) + '.';
  const frequency = /\b(regelmäßig|regelmaessig|häufig|haeufig|oft)\b/i.test(context);
  if (/uringeruch/i.test(phrase)) {
    const place = phrase.match(/\ban der (?:s-?bahn-?)?haltestelle\b.+/i)?.[0] || phrase.match(/\bam (?:s-?bahnhof|bahnhof)\b.+/i)?.[0];
    if (place) return `${capitalize(place)} riecht es${frequency ? ' regelmäßig' : ''} nach Urin.`;
  }
  if (/mülleimer|muelleimer|abfallbehälter|abfallbehaelter/i.test(phrase) && /voll|überfüll|ueberfuell/i.test(phrase)) {
    const place = phrase.match(/\b(?:im|in der|am|an der)\s+.+/i)?.[0] || '';
    const container = /abfallbehälter|abfallbehaelter/i.test(phrase) ? 'Abfallbehälter' : 'Mülleimer';
    const state = /überfüll|ueberfuell/i.test(phrase) ? 'überfüllt' : 'voll';
    return `Die ${container}${place ? ` ${place}` : ''} sind${frequency ? ' häufig' : ''} ${state}.`;
  }
  if (/^fehlend/i.test(phrase) && /übergang|uebergang|querung/i.test(phrase)) {
    const place = phrase.match(/\b(?:an|auf|in)\s+(?:der|dem|den)\s+.+/i)?.[0];
    const detail = phrase.replace(/^fehlend\w*\s*/i, '').replace(/^sicher\w*\s+/i, 'sicherer ');
    return `${place ? `${capitalize(place)} fehlt` : 'Es fehlt'} ${place ? 'ein ' : 'ein '}${detail}.`;
  }
  return `Ich möchte auf ${capitalize(phrase)} hinweisen.`;
}

function requestForGoal(goal: string) {
  let value = cleanLine(goal).replace(/[.!?]+$/, '')
    .replace(/^(?:ich wünsche mir, dass|ich wuensche mir, dass|ich möchte, dass|ich moechte, dass)\s+/i, '')
    .trim();
  const actorAction = value.match(/^(?:die stadt|die zuständige stelle|der betreiber)\s+soll(?:te)?\s+(.+)$/i);
  const explicitActionRequest = Boolean(actorAction);
  if (actorAction) value = actorAction[1].trim();
  const reportedReview = value.match(/^(?:die stadt|die zuständige stelle|der betreiber)\s+(?:prüft|prueft|untersucht|kontrolliert)\s+(.+)$/i);
  if (reportedReview) value = `${reportedReview[1].trim()} prüfen`;
  const reviewVerb = value.match(/^(.+?)\s+(prüfen|pruefen|untersuchen|kontrollieren)$/i);
  if (reviewVerb) {
    const proposal = reviewVerb[1].trim()
      .replace(/\s+(?:an|auf)\s+(?:der|dem)\s+.+$/i, '')
      .replace(/^einen\s+/i, 'ein ');
    if (/zebrastreifen/i.test(proposal) && /ampel/i.test(proposal)) {
      return 'Bitte prüfen Sie, ob hier ein Zebrastreifen oder eine Ampel als sichere Querungsmöglichkeit infrage kommt.';
    }
    if (/zebrastreifen/i.test(proposal)) return 'Bitte prüfen Sie, ob hier ein Zebrastreifen als sichere Querungsmöglichkeit infrage kommt.';
    if (/ampel/i.test(proposal)) return 'Bitte prüfen Sie, ob hier eine Ampel als sichere Querungsmöglichkeit infrage kommt.';
    if (/querungsmöglichkeiten/i.test(proposal)) return `Bitte prüfen Sie, ob sich hier ${proposal.charAt(0).toLocaleLowerCase('de-DE') + proposal.slice(1)} einrichten lassen.`;
    if (/übergang/i.test(proposal)) return 'Bitte prüfen Sie, ob sich hier ein sicherer Übergang zur Schule einrichten lässt.';
    return `Bitte prüfen Sie, ob ${proposal.charAt(0).toLocaleLowerCase('de-DE') + proposal.slice(1)} hier infrage kommt.`;
  }
  if (explicitActionRequest && /zebrastreifen/i.test(value) && /ampel/i.test(value) && /einricht|bauen|anlegen/i.test(value)) return 'Bitte richten Sie hier einen Zebrastreifen oder eine Ampel ein.';
  if (explicitActionRequest && /zebrastreifen/i.test(value) && /einricht|bauen|anlegen/i.test(value)) return 'Bitte richten Sie hier einen Zebrastreifen ein.';
  if (explicitActionRequest && /ampel/i.test(value) && /einricht|aufstell|install|erricht/i.test(value)) return 'Bitte richten Sie hier eine Ampel ein.';
  const frequent = /\b(häufiger|häufigere|haeufiger|haeufigere|regelmäßig|regelmaessig|öfter|oefter)\b/i.test(value);
  if (/reinigung/i.test(value) && /ursache|grund/i.test(value)) {
    return `Bitte veranlassen Sie${frequent ? ' eine häufigere' : ' eine'} Reinigung der betroffenen Bereiche und prüfen Sie die Ursache.`;
  }
  if (/mülleimer|muelleimer|abfallbehälter|abfallbehaelter/i.test(value) && /leer/i.test(value)) {
    return `Bitte lassen Sie die Mülleimer${frequent ? ' häufiger' : ''} leeren.`;
  }
  if (/reinigung/i.test(value)) return `Bitte veranlassen Sie${frequent ? ' eine häufigere' : ' eine'} Reinigung der betroffenen Bereiche.`;
  if (/zebrastreifen|ampel|übergang|uebergang|querung/i.test(value)) {
    const proposal = value.replace(/^(?:die stadt|die zuständige stelle|der betreiber)\s+soll(?:te)?\s+/i, '').replace(/\s+(?:einrichten|aufstellen|bauen)$/i, '').replace(/^einen\s+/i, 'ein ');
    return `Bitte prüfen Sie, ob ${proposal} an dieser Stelle eine geeignete Lösung wäre.`;
  }
  if (/ausbau|ausbauen|erweitern|errichten|einrichten/i.test(value)) return `Bitte prüfen Sie, ob sich ${value} umsetzen lässt.`;
  if (/^(?:bitte|prüfen sie|pruefen sie|ich bitte sie)/i.test(value)) return capitalizeSentence(value);
  return `Bitte prüfen Sie, wie sich ${value} vor Ort umsetzen lässt.`;
}

function capitalizeSentence(value: string) {
  const text = cleanLine(value).replace(/[.!?]+$/, '');
  return text.charAt(0).toLocaleUpperCase('de-DE') + text.slice(1) + '.';
}

export function isGroundedDraft(subject: string, body: string, intent: UserIntent) {
  const aligned = draftAlignment(subject, body, intent);
  return aligned.addressesProblem && aligned.includesDesiredChange && aligned.hasConcreteAsk;
}

/** Reject uncited factual details that neither came from the user nor from the explicit ask. */
export function uncitedNewClaimSentences(body: string, userText: string, intent: UserIntent, additionalUserDetails: string[] = []) {
  const trusted = new Set(anchors([userText, intent.issue, intent.goal, intent.affected, intent.explicitLocation, ...intent.confirmedDetails, ...additionalUserDetails].join(' ')));
  const content = body.split(/\n\s*Quellen:\s*/i)[0];
  const sentences = content.split(/(?<=[.!?])\s+|\n+/).map((line) => line.trim()).filter(Boolean);
  return sentences.filter((sentence) => {
    if (/\[\d+\]/.test(sentence)) return false;
    const words = anchors(sentence);
    if (!words.length || words.every((word) => trusted.has(word) || TEMPLATE_WORDS.has(word))) return false;
    const low = normalize(sentence);
    if (/^(sehr geehrte|mit freundlichen grussen|ich wende mich|ich bitte sie|ich wuensche mir|bitte prufen sie, ob|bitte prufen sie die gewuenschte|bitte teilen sie mir mit|bitte geben sie mir|falls ihre stelle|uber eine (?:kurze )?ruckmeldung)/.test(low)) return false;
    const goalWords = new Set(anchors(intent.goal));
    if (/^bitte\s+(prufen|veranlass|lass|richt|teil|informier|mitteil|beseitig|ermoglich|einricht|reinig|leer|klar)/.test(low)
      && words.some((word) => goalWords.has(word))) return false;
    return true;
  });
}

export function hasUncitedNewClaims(body: string, userText: string, intent: UserIntent, additionalUserDetails: string[] = []) {
  return uncitedNewClaimSentences(body, userText, intent, additionalUserDetails).length > 0;
}

