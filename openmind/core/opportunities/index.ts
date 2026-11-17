import data from '@/data/opportunities.json';
import { getSource, isTrusted, type SourceKind } from '@/core/sources';

export type OpportunityType = 'petition' | 'ehrenamt' | 'beteiligung';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  source: string;
  title: string;
  summary: string;
  url: string;
  region: string;
  deadline?: string;
  deadlineNote?: string;
  topics: string[];
  /** Screen in the app that helps with this (e.g. writing the § 24 letter). */
  inApp?: string;
  live?: 'bundestag-count';
}

export interface LiveOpportunity extends Opportunity {
  sourceName: string;
  sourceKind: SourceKind;
  /** Result of the last link check; false hides the entry. */
  reachable: boolean;
  checkedAt: string;
  /** Extra live fact, e.g. "81 Petitionen offen". */
  liveNote?: string;
}

// Only entries whose link points to a whitelisted source can ever be shown.
export const OPPORTUNITIES = (data.items as Opportunity[]).filter((o) => isTrusted(o.url));

const UA = 'OpenMind/0.1 (Beteiligungs-App, Prototyp)';
const DAY = 86_400_000;

async function check(o: Opportunity): Promise<{ reachable: boolean; liveNote?: string }> {
  try {
    const res = await fetch(o.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000), redirect: 'follow' });
    if (!res.ok) return { reachable: false };
    if (o.live !== 'bundestag-count') return { reachable: true };
    const n = (await res.text()).match(/Mitzeichnungsfrist\s*<span>\((\d+)\)<\/span>/)?.[1];
    return { reachable: true, liveNote: n ? `${n} Petitionen offen` : undefined };
  } catch {
    // A timeout is not proof that the page is gone; keep it, the next check decides.
    return { reachable: true };
  }
}

let cache: { at: number; items: LiveOpportunity[] } | undefined;
let running: Promise<LiveOpportunity[]> | undefined;

/** All opportunities with a fresh link check (at most once a day). Expired deadlines are left out. */
export async function liveOpportunities(force = false): Promise<LiveOpportunity[]> {
  if (!force && cache && Date.now() - cache.at < DAY) return cache.items;
  running ??= Promise.all(
    OPPORTUNITIES.map(async (o) => {
      const source = getSource(o.source);
      return { ...o, ...(await check(o)), sourceName: source?.name ?? o.source, sourceKind: source?.kind ?? 'amtlich', checkedAt: new Date().toISOString() };
    }),
  )
    .then((items) => {
      cache = { at: Date.now(), items };
      return items;
    })
    .finally(() => { running = undefined; });
  const items = await running;
  const today = new Date().toISOString().slice(0, 10);
  return items.filter((o) => o.reachable && (!o.deadline || o.deadline >= today));
}
