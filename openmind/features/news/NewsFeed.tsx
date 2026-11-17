'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, BookmarkCheck, ExternalLink, HandHeart, Info, RefreshCw, Sparkles } from 'lucide-react';
import { CardSkeleton, IconButton, Pill, Reveal, Sheet, SourceSeal, useToast, type SourceKind } from '@/ui';
import KimBase from '@/components/Kim';
import { ago } from './time';

export interface NewsItem {
  id: string;
  title: string;
  teaser: string;
  url: string;
  publishedAt: string;
  topics: string[];
  region: string | null;
  source: { id: string; name: string; kind: SourceKind; summarize: boolean };
  saved: boolean;
  reasons: string[];
}

const PAGE = 12;

function Explain({ item }: { item: NewsItem }) {
  const [state, setState] = useState<{ text?: string; error?: string; busy?: boolean }>({});
  const run = async () => {
    setState({ busy: true });
    const r = await fetch('/api/agents/news-explain', { method: 'POST', body: JSON.stringify({ source: item.source.id, title: item.title, teaser: item.teaser }) })
      .then((x) => x.json()).catch(() => ({ error: 'Keine Verbindung.' }));
    setState(r.error || r.blocked ? { error: r.error ?? r.message } : { text: r.summary });
  };
  if (state.text) return <p className="rounded-3xl p-4" style={{ background: 'var(--sage-bg)' }}><strong className="block text-sm mb-1" style={{ color: 'var(--sage)' }}>Kurz erklärt · KI</strong>{state.text}</p>;
  return (
    <div className="grid gap-2">
      <button className="btn-secondary gap-2" disabled={state.busy} onClick={run}><Sparkles size={18} aria-hidden />{state.busy ? 'Kim liest …' : 'Kurz erklärt'}</button>
      {state.error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--contra-text)' }}>{state.error}</p>}
    </div>
  );
}

export function NewsFeed({ interests }: { interests: string[] }) {
  const toast = useToast();
  const [items, setItems] = useState<NewsItem[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('Für dich');
  const [open, setOpen] = useState<NewsItem>();
  const [why, setWhy] = useState<string>();
  const [limit, setLimit] = useState(PAGE);
  const [hidden, setHidden] = useState<string[]>([]);

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    const r = await fetch(`/api/news${refresh ? '?refresh=1' : ''}`).then((x) => x.json()).catch(() => ({ error: 'Keine Verbindung.' }));
    setBusy(false);
    if (r.error) setError(r.error);
    else { setError(''); setItems(r.items); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filters = ['Für dich', ...interests, 'Faktencheck', 'Gemerkt'];
  const shown = useMemo(() => {
    if (!items) return [];
    if (filter !== 'Gemerkt' && hidden.length) return filterBy(items.filter((i) => !hidden.includes(i.id)));
    return filterBy(items);
  }, [items, filter, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  function filterBy(items: NewsItem[]) {
    if (filter === 'Für dich') return items;
    if (filter === 'Gemerkt') return items.filter((i) => i.saved);
    if (filter === 'Faktencheck') return items.filter((i) => i.source.kind === 'faktencheck');
    return items.filter((i) => i.topics.includes(filter));
  }

  const toggleSave = async (item: NewsItem) => {
    const saved = !item.saved;
    // Optimistic: the bookmark flips at once and flips back if saving fails.
    const set = (v: boolean) => setItems((list) => list?.map((i) => (i.id === item.id ? { ...i, saved: v } : i)));
    set(saved);
    setOpen((o) => (o?.id === item.id ? { ...o, saved } : o));
    const ok = await fetch('/api/saved', { method: 'POST', body: JSON.stringify({ kind: 'news', itemId: item.id, saved }) }).then((r) => r.ok).catch(() => false);
    if (!ok) { set(!saved); toast('Das hat nicht geklappt'); } else toast(saved ? 'Gemerkt' : 'Nicht mehr gemerkt');
  };

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-label="Nachrichten">
      <div className="flex items-center justify-between">
        <h2 className="sr-only">Neuigkeiten</h2>
        <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Aus geprüften Quellen, für dich sortiert</span>
        <IconButton label="Aktualisieren" onClick={() => load(true)} disabled={busy}>
          <motion.span animate={busy ? { rotate: 360 } : { rotate: 0 }} transition={busy ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0 }} className="flex"><RefreshCw size={20} aria-hidden /></motion.span>
        </IconButton>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" role="group" aria-label="Filter">
        {filters.map((f) => <Pill key={f} active={filter === f} onClick={() => { setFilter(f); setLimit(PAGE); }}>{f}</Pill>)}
      </div>

      {!items && !error && <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>}
      {error && <p role="alert" className="card font-semibold" style={{ color: 'var(--contra-text)' }}>{error}</p>}
      {items && !shown.length && (
        <div className="card flex items-center gap-3"><KimBase pose="wait" size={56} /><p className="font-semibold">{filter === 'Gemerkt' ? 'Noch nichts gemerkt.' : 'Gerade ist es hier ruhig.'}</p></div>
      )}

      <AnimatePresence initial={false}>
        {shown.slice(0, limit).map((item, n) => (
          <Reveal key={item.id} index={n % PAGE}>
            {/* Swipe right to save, left to hide for now. Buttons below do the same for everyone who cannot swipe. */}
            <motion.article
              className="card grid grid-cols-[minmax(0,1fr)] gap-2"
              data-testid="news-card"
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100 && !item.saved) toggleSave(item);
                else if (info.offset.x < -100) { setHidden((h) => [...h, item.id]); toast('Ausgeblendet'); }
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <SourceSeal kind={item.source.kind} name={item.source.name} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{ago(item.publishedAt)}</span>
              </div>
              <button className="text-left text-lg font-extrabold leading-snug" onClick={() => setOpen(item)}>{item.title}</button>
              {item.teaser && <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.teaser}</p>}
              <div className="flex items-center gap-2">
                <button className="pill !min-h-[40px] !shadow-none" style={{ background: 'var(--muted)' }} onClick={() => setWhy(item.id === why ? undefined : item.id)} aria-expanded={why === item.id}>
                  <Info size={16} aria-hidden />Warum?
                </button>
                <span className="flex-1" />
                <IconButton label={item.saved ? 'Nicht mehr merken' : 'Merken'} onClick={() => toggleSave(item)}>
                  {item.saved ? <BookmarkCheck size={20} aria-hidden style={{ color: 'var(--primary)' }} /> : <Bookmark size={20} aria-hidden />}
                </IconButton>
              </div>
              <AnimatePresence>
                {why === item.id && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-sm grid gap-1 overflow-hidden">
                    {item.reasons.map((r) => <li key={r}>• {r}</li>)}
                    <li style={{ color: 'var(--text-secondary)' }}>Sortiert nach Relevanz, nie nach Meinung.</li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.article>
          </Reveal>
        ))}
      </AnimatePresence>
      {shown.length > limit && <button className="btn-secondary" onClick={() => setLimit(limit + PAGE)}>Mehr laden</button>}

      <Sheet open={Boolean(open)} onClose={() => setOpen(undefined)} title={open?.title ?? ''}>
        {open && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SourceSeal kind={open.source.kind} name={open.source.name} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(open.publishedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            {open.teaser && <p>{open.teaser}</p>}
            {open.source.summarize ? <Explain key={open.id} item={open} /> : <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Presse: Wir zeigen nur Titel und Link. Den Text liest du beim Original.</p>}
            <a className="btn-primary gap-2" href={open.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden />Original lesen</a>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary gap-2" onClick={() => toggleSave(open)}>{open.saved ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}{open.saved ? 'Gemerkt' : 'Merken'}</button>
              <Link className="btn-secondary gap-2" href="/mitmachen"><HandHeart size={18} aria-hidden />Mitmachen</Link>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}
