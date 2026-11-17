import Parser from 'rss-parser';
import { sql } from 'drizzle-orm';
import { db } from '@/core/db/client';
import * as schema from '@/core/db/schema';
import { SOURCES, sourceOf, type Source } from '@/core/sources';
import { tagTopics } from './tagging';

export interface FeedItem { title: string; teaser: string; url: string; publishedAt: string }

const UA = 'OpenMind/0.1 (Beteiligungs-App, Prototyp)';
const TEASER_MAX = 220;
const parser = new Parser({ timeout: 12_000, headers: { 'User-Agent': UA } });

const clean = (s = '') =>
  s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

/** Cuts at a word boundary so the teaser stays a short excerpt and never becomes the article. */
export function shorten(s: string, max = TEASER_MAX) {
  if (s.length <= max) return s;
  return s.slice(0, s.lastIndexOf(' ', max - 1)).replace(/[,;:.\s]+$/, '') + ' …';
}

async function readRss(url: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(url);
  return feed.items
    .filter((i) => i.title && i.link)
    .map((i) => ({
      title: clean(i.title),
      teaser: clean(i.contentSnippet || i.content || i.summary || ''),
      url: i.link!,
      publishedAt: new Date(i.isoDate || i.pubDate || Date.now()).toISOString(),
    }));
}

/** The city publishes no RSS feed; its news page lists date, title, teaser and link per entry. */
export function parseDuesseldorf(html: string, base: string): FeedItem[] {
  const items: FeedItem[] = [];
  const block = /<time datetime="(\d{4}-\d{2}-\d{2})">[\s\S]*?<a[^>]*href="([^"]*newsdetail[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p>([\s\S]*?)<a class="news-more"/g;
  for (const m of html.matchAll(block)) {
    items.push({ publishedAt: new Date(`${m[1]}T08:00:00Z`).toISOString(), url: new URL(m[2], base).href, title: clean(m[3]), teaser: clean(m[4]) });
  }
  return items;
}

async function readSource(s: Source): Promise<FeedItem[]> {
  if (!s.feed) return [];
  if (s.feed.type === 'rss') return readRss(s.feed.url);
  const res = await fetch(s.feed.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseDuesseldorf(await res.text(), s.feed.url);
}

export interface FetchReport { source: string; ok: boolean; items: number; error?: string }

/** Fetches every whitelisted feed. A failing feed is reported and skipped; the others go on. */
export async function fetchAllNews(): Promise<FetchReport[]> {
  const cutoff = Date.now() - 21 * 86_400_000;
  return Promise.all(
    SOURCES.filter((s) => s.feed).map(async (s): Promise<FetchReport> => {
      try {
        // A feed entry may only link to its own source: no javascript:, no foreign sites.
        const items = (await readSource(s)).filter((i) => Date.parse(i.publishedAt) > cutoff && sourceOf(i.url)?.domain === s.domain).slice(0, 40);
        for (const i of items) {
          const row = {
            source: s.id,
            title: i.title,
            teaser: s.teaser ? shorten(i.teaser) : '',
            url: i.url,
            publishedAt: i.publishedAt,
            topics: tagTopics(`${i.title} ${i.teaser}`),
            region: s.region,
          };
          await db.insert(schema.newsItems).values(row).onConflictDoUpdate({ target: schema.newsItems.url, set: { title: row.title, teaser: row.teaser, topics: row.topics } });
        }
        return { source: s.id, ok: true, items: items.length };
      } catch (e) {
        return { source: s.id, ok: false, items: 0, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  ).finally(() =>
    // Keep the table small: old news is not useful for participation.
    db.delete(schema.newsItems).where(sql`${schema.newsItems.publishedAt} < ${new Date(cutoff).toISOString()}`),
  );
}

let running: Promise<FetchReport[]> | undefined;
let lastRun = 0;
const INTERVAL = 30 * 60_000;

/** Refreshes at most every 30 minutes; parallel callers share one run. */
export function refreshNewsIfStale(force = false) {
  if (running) return running;
  if (!force && Date.now() - lastRun < INTERVAL) return undefined;
  lastRun = Date.now();
  running = fetchAllNews().finally(() => { running = undefined; });
  return running;
}
