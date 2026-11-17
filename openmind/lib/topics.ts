import type { Topic } from './types';
import radwege from '../data/topics/radwege-bilk.json';
import ganztag from '../data/topics/ganztagsplaetze-grundschulen.json';
import ki from '../data/topics/ki-kennzeichnung-eu.json';
import pflege from '../data/topics/schichtplaene-pflege.json';
import platanen from '../data/topics/platanen-faellung.json';

export const TOPICS = [radwege, ganztag, ki, pflege, platanen] as Topic[];

export function getTopic(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Relevance, never direction: affected place/interests first, then nearest deadline. */
export function rankTopics(topics: Topic[], interests: string[], location: string) {
  const score = (t: Topic) =>
    (t.location.toLowerCase().includes(location.toLowerCase()) || t.level === 'stadt' ? 2 : 0) +
    t.tags.filter((tag) => interests.some((i) => i.toLowerCase() === tag.toLowerCase())).length;
  return [...topics].sort((a, b) => score(b) - score(a) || a.deadline.localeCompare(b.deadline));
}

export function whyShown(t: Topic, interests: string[]) {
  const reasons: string[] = [];
  if (t.level === 'stadt') reasons.push('betrifft deinen Wohnort');
  const hit = t.tags.filter((tag) => interests.some((i) => i.toLowerCase() === tag.toLowerCase()));
  if (hit.length) reasons.push(`passt zu deinen Interessen: ${hit.join(', ')}`);
  reasons.push(`Frist ${formatDate(t.deadline)}`);
  return reasons;
}

export function formatDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function corpusText(topic: Topic) {
  return topic.corpus.map((c) => `[${c.id}] ${c.title}: ${c.text} (Quelle: ${c.source})`).join('\n');
}
