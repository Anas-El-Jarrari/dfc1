import { describe, expect, it } from 'vitest';
import { isTrusted, sourceOf } from '@/core/sources';
import { parseDuesseldorf, shorten } from '@/core/news/fetch';
import { scoreNews } from '@/core/news/rank';
import { tagTopics } from '@/core/news/tagging';
import { OPPORTUNITIES } from '@/core/opportunities';

describe('Quellen-Whitelist', () => {
  it('erkennt geprüfte Quellen, auch Subdomains', () => {
    expect(sourceOf('https://www1.wdr.de/nachrichten/x.html')?.id).toBe('wdr');
    expect(sourceOf('https://www.duesseldorf.de/rat')?.kind).toBe('amtlich');
  });
  it('lehnt fremde und nachgemachte Domains ab', () => {
    expect(isTrusted('https://example.com/news')).toBe(false);
    expect(isTrusted('https://wdr.de.evil.com/x')).toBe(false);
    expect(isTrusted('https://notwdr.de/x')).toBe(false);
    expect(isTrusted('javascript:alert(1)')).toBe(false);
  });
  it('jedes Mitmach-Angebot zeigt auf eine geprüfte Quelle', () => {
    expect(OPPORTUNITIES.length).toBeGreaterThan(5);
    for (const o of OPPORTUNITIES) expect(isTrusted(o.url)).toBe(true);
  });
});

describe('News', () => {
  it('Anriss bleibt kurz und endet an einer Wortgrenze', () => {
    const t = shorten('Wort '.repeat(100));
    expect(t.length).toBeLessThanOrEqual(222);
    expect(t.endsWith(' …')).toBe(true);
  });
  it('Themen werden am Wortanfang erkannt', () => {
    expect(tagTopics('Neue Radwege in Bilk')).toContain('Verkehr');
    expect(tagTopics('Zwei Grad wärmer')).not.toContain('Verkehr');
    expect(tagTopics('Mehr Kita-Plätze')).toContain('Kinder');
  });
  it('liest die Nachrichtenseite der Stadt', () => {
    const html = `<small><time datetime="2026-11-13">13.11.2026</time></small><h2><a href="/aktuelles/news/detailansicht/newsdetail/test">
      Neue Radwege</a></h2><p>Die Stadt baut &amp; plant.<br /><a class="news-more" href="/x">Mehr</a></p>`;
    const [item] = parseDuesseldorf(html, 'https://www.duesseldorf.de/aktuelles/news');
    expect(item).toMatchObject({ title: 'Neue Radwege', teaser: 'Die Stadt baut & plant.', url: 'https://www.duesseldorf.de/aktuelles/news/detailansicht/newsdetail/test' });
    expect(item.publishedAt.startsWith('2026-11-13')).toBe(true);
  });
  it('sortiert nach Interesse und Nähe, mit Begründung', () => {
    const now = Date.parse('2026-11-15T12:00:00Z');
    const me = { interests: ['Verkehr'], location: 'Düsseldorf-Bilk' };
    const local = scoreNews({ topics: ['Verkehr'], region: 'Düsseldorf', publishedAt: '2026-11-14T12:00:00Z' }, me, now);
    const far = scoreNews({ topics: ['Gesundheit'], region: 'Bund', publishedAt: '2026-11-14T12:00:00Z' }, me, now);
    expect(local.score).toBeGreaterThan(far.score);
    expect(local.reasons).toEqual(['Dein Interesse: Verkehr', 'Betrifft deine Stadt']);
    const other = scoreNews({ topics: ['Verkehr'], region: 'Düsseldorf', publishedAt: '2026-11-14T12:00:00Z' }, { interests: ['Bildung'], location: 'Köln' }, now);
    expect(other.score).toBeLessThan(local.score);
  });
});
