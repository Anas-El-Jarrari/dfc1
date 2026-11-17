import whitelist from '@/data/sources/whitelist.json';

export type SourceKind = 'amtlich' | 'presse' | 'faktencheck' | 'beteiligung' | 'zivilgesellschaft';

export interface Source {
  id: string;
  name: string;
  domain: string;
  kind: SourceKind;
  region: string;
  feed?: { type: 'rss' | 'html-duesseldorf'; url: string };
  /** May a short excerpt be shown? Official texts yes; press only title and link. */
  teaser: boolean;
  /** May the AI summarize it? Only official texts. */
  summarize: boolean;
}

export const SOURCES = whitelist.sources as Source[];
export const getSource = (id: string) => SOURCES.find((s) => s.id === id);

/** Host of a URL, or undefined for anything that is not an http(s) URL. */
function host(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.hostname.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/** The whitelisted source a URL belongs to. Subdomains count (www1.wdr.de → wdr.de), look-alikes do not (wdr.de.evil.com). */
export function sourceOf(url: string): Source | undefined {
  const h = host(url);
  if (!h) return undefined;
  return [...SOURCES]
    .sort((a, b) => b.domain.length - a.domain.length)
    .find((s) => h === s.domain || h.endsWith(`.${s.domain}`));
}

export const isTrusted = (url: string) => Boolean(sourceOf(url));
