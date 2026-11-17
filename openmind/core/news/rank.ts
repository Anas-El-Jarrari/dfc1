export interface RankInput { topics: string[]; region: string | null; publishedAt: string }
export interface Profile { interests: string[]; location: string }

const REGION_SCORE: Record<string, number> = { 'Düsseldorf': 3, Rheinland: 2, NRW: 1.5, Bund: 1, EU: 1 };

/**
 * Relevance only, never opinion: how many of my interests, how close to where I live, how fresh.
 * Returns the score and the human-readable reasons for "Warum sehe ich das?".
 */
export function scoreNews(item: RankInput, profile: Profile, now = Date.now()) {
  const reasons: string[] = [];
  const hits = item.topics.filter((t) => profile.interests.includes(t));
  if (hits.length) reasons.push(`Dein Interesse: ${hits.join(', ')}`);

  const livesInDus = /düsseldorf/i.test(profile.location);
  let region = REGION_SCORE[item.region ?? ''] ?? 0;
  if (!livesInDus && (item.region === 'Düsseldorf' || item.region === 'Rheinland')) region = 0.5;
  if (livesInDus && item.region === 'Düsseldorf') reasons.push('Betrifft deine Stadt');
  else if (livesInDus && item.region === 'Rheinland') reasons.push('Aus deiner Region');

  const ageDays = Math.max(0, (now - Date.parse(item.publishedAt)) / 86_400_000);
  const fresh = 3 * Math.exp(-ageDays / 3);
  if (ageDays < 1) reasons.push('Neu von heute');

  return { score: hits.length * 3 + region + fresh, reasons: reasons.length ? reasons : ['Aktuell und aus geprüfter Quelle'] };
}
