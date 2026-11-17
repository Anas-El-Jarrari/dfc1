import type { Source, UserIntent } from './types';

const STOP = new Set('aber alle als am an auch auf aus bei bin bis das dass dem den der des die dies doch du durch ein eine einer eines er es fur gegen gewesen hat hier ich im in ist ja kein keine mit nach nicht noch oder sein seine sich sie sind so uber um und von vor war was weil welcher wenn wie wir zu zum zur'.split(' '));
const normalize = (value: string) => value.replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de-DE').replace(/[^a-z0-9]+/g, ' ').trim();
const terms = (value: string) => [...new Set(normalize(value).split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)))];

/** Keep the evidence corpus small and ordered around this user's specific request. */
export function sourcesForIntent(sources: Source[], intent: UserIntent, location: string, limit = 8) {
  const issue = terms(intent.issue), goal = terms(intent.goal), place = terms(location);
  return [...sources].map((source) => {
    const title = normalize(source.title + ' ' + source.url);
    const content = normalize([source.title, source.url, source.snippet, source.text || ''].join(' '));
    const overlap = (items: string[]) => items.reduce((score, term) => score + (content.includes(term) ? 1 : 0), 0);
    let score = overlap(issue) * 3 + overlap(goal) * 4 + overlap(place) * 2;
    if (issue.length && normalize(intent.issue).length > 10 && content.includes(normalize(intent.issue))) score += 8;
    if (goal.length && normalize(intent.goal).length > 10 && content.includes(normalize(intent.goal))) score += 10;
    if (/kontakt|ansprech|service|meldung|beschwerde|formular|email|e mail/.test(title)) score += 3;
    if (/recht|gesetz|satzung|ordnung|verkehrs|sauber|reinigung|strassen|bahn|haltestell/.test(title)) score += 2;
    if (/\.gov\b|\.gouv\b|\.nrw\b|duesseldorf\.de|rvg\.de|rheinbahn\.de|bahn\.de/.test(title)) score += 2;
    return { source, score };
  }).sort((a, b) => b.score - a.score || a.source.id - b.source.id).slice(0, limit).map(({ source }) => source);
}

