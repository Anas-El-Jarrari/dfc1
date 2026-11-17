import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { HttpError } from '@/core/http/safeRoute';
import type { Source } from './types';
export function publicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) return null;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost') || isIP(host)) return null;
    return url.href;
  } catch { return null; }
}
function privateAddress(ip: string) {
  if (ip.includes(':')) return !/^[23][0-9a-f]{3}:/i.test(ip);
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
}
async function ensurePublic(url: string) {
  if (!publicUrl(url)) throw new Error('Keine öffentliche Quellenadresse.');
  const records = await lookup(new URL(url).hostname, { all: true });
  if (!records.length || records.some((r) => privateAddress(r.address))) throw new Error('Interne Netzwerkadressen sind keine Kontaktquelle.');
}
function decode(text: string) {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; })
    .replace(/&commat;/gi, '@').replace(/&period;/gi, '.').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&nbsp;/gi, ' ');
}
export async function readPublicPage(url: string, signal?: AbortSignal): Promise<{ text: string; emails: string[]; emailEvidence: string[]; links: string[] }> {
  for (let redirects = 0; redirects <= 3; redirects++) {
    await ensurePublic(url);
    const response = await fetch(url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.any([AbortSignal.timeout(12000), ...(signal ? [signal] : [])]), headers: { accept: 'text/html,text/plain', 'user-agent': 'OpenMind/1.0 (contact source verification)' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) { url = new URL(response.headers.get('location') || '', url).href; continue; }
    if (!response.ok || !/text\/(html|plain)|application\/xhtml/.test(response.headers.get('content-type') || '')) throw new Error('Kontaktseite ist nicht als Text erreichbar.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Leere Kontaktquelle.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 1_000_000) { await reader.cancel(); throw new Error('Quellseite ist zu groß.'); } chunks.push(value); }
    const html = decode(Buffer.concat(chunks).toString('utf8')).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const emails = [...new Set((html.match(/[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map((x) => x.toLowerCase()))];
    const pageText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const emailEvidence = emails.map((email) => {
      const plainIndex = pageText.toLowerCase().indexOf(email);
      if (plainIndex >= 0) return pageText.slice(Math.max(0, plainIndex - 220), Math.min(pageText.length, plainIndex + email.length + 220));
      // Some official pages expose the address only in a mailto link; retain
      // its nearby heading/link context so the route can be classified safely.
      const htmlIndex = html.toLowerCase().indexOf(email);
      return htmlIndex < 0 ? '' : html.slice(Math.max(0, htmlIndex - 500), Math.min(html.length, htmlIndex + email.length + 500))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }).filter(Boolean).slice(0, 8);
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].flatMap((m) => { try { const target = publicUrl(new URL(m[1], url).href); return target ? [target] : []; } catch { return []; } });
    return { text: pageText.slice(0, 12000), emails, emailEvidence, links };
  }
  throw new Error('Zu viele Weiterleitungen in der Kontaktquelle.');
}
export const searchUrl = () => (process.env.SEARXNG_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
export function mergeSources(...groups: Source[][]) {
  const out: Source[] = [];
  for (const item of groups.flat()) if (!out.some((s) => s.url === item.url)) out.push({ ...item, id: out.length + 1 });
  return out.slice(0, 24);
}
export async function runSearches(queries: string[], signal?: AbortSignal): Promise<Source[]> {
  const found: Source[] = []; let succeeded = 0;
  for (const query of [...new Set(queries)].slice(0, 3)) {
    try {
      const url = new URL(searchUrl() + '/search'); url.searchParams.set('q', query.slice(0, 400)); url.searchParams.set('format', 'json'); url.searchParams.set('language', 'de-DE');
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.any([AbortSignal.timeout(18000), ...(signal ? [signal] : [])]) });
      if (!response.ok) throw new Error('SearXNG nicht erreichbar.');
      const data = await response.json(); succeeded++;
      for (const item of (Array.isArray(data.results) ? data.results : []).slice(0, 6)) {
        const target = publicUrl(String(item.url || '')); if (!target) continue;
        found.push({ id: 0, title: String(item.title || new URL(target).hostname).slice(0, 220), url: target, snippet: String(item.content || '').slice(0, 1800), checkedAt: new Date().toISOString() });
      }
    } catch { if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError'); }
  }
  if (!succeeded) throw new HttpError(503, 'SearXNG ist nicht erreichbar. Starte die lokale Suche und aktiviere das JSON-Format.');
  return mergeSources(found);
}
export async function enrichSources(sources: Source[], signal?: AbortSignal) {
  // The caller passes the relevance-ranked sources shown to the routing agent.
  // Enrich every one of them so a valid contact on source 9 or 10 is not silently
  // discarded merely because the extractor previously stopped at source 8.
  const results = await Promise.allSettled(sources.map((s) => readPublicPage(s.url, signal)));
  return sources.map((s, i) => { const result = results[i]; return result?.status === 'fulfilled' ? { ...s, ...result.value } : s; });
}
export function sourceContext(sources: Source[], options: { maxSources?: number; maxChars?: number } = {}) {
  const maxSources = options.maxSources ?? 8, maxChars = options.maxChars ?? 1500;
  return sources.length ? sources.slice(0, maxSources).map((s) => '[' + s.id + '] ' + s.title + '\n' + s.url + '\n'
    + (s.text || s.snippet).slice(0, maxChars) + '\nBelegte E-Mail-Adressen: ' + (s.emails || []).join(', ')
    + ((s.emailEvidence || []).length ? '\nKontext zur E-Mail-Adresse: ' + s.emailEvidence!.join(' | ').slice(0, 900) : '')).join('\n\n')
    : 'Keine belastbaren Quellen. Keine Kontakte, Rechtsnormen oder lokalen Tatsachen erfinden.';
}
export async function verifyRecipient(email: string, sourceUrl: string, sources: Source[]) {
  if (!sources.some((s) => s.url === sourceUrl)) throw new HttpError(400, 'Wähle eine Kontaktquelle aus der Recherche. Für eine andere Quelle starte die Recherche erneut.');
  let page;
  try { page = await readPublicPage(sourceUrl); } catch { throw new HttpError(422, 'Die Kontaktquelle konnte nicht geprüft werden. Es wird keine E-Mail gesendet.'); }
  if (!page.emails.includes(email.toLowerCase())) throw new HttpError(422, 'Diese E-Mail-Adresse steht nicht in der Kontaktquelle. Bitte Empfänger und Quelle prüfen.');
  return { email: email.toLowerCase(), sourceUrl, checkedAt: new Date().toISOString() };
}

