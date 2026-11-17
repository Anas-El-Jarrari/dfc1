'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, CalendarClock, ExternalLink, HandHeart, Landmark, PenLine, ScrollText } from 'lucide-react';
import { CardSkeleton, IconButton, Pill, Reveal, SourceSeal, useToast, type SourceKind } from '@/ui';

interface Opportunity {
  id: string;
  type: 'petition' | 'ehrenamt' | 'beteiligung';
  title: string;
  summary: string;
  url: string;
  region: string;
  deadline?: string;
  deadlineNote?: string;
  inApp?: string;
  liveNote?: string;
  sourceName: string;
  sourceKind: SourceKind;
  saved: boolean;
  forYou: boolean;
  reasons: string[];
}

const TYPES = [
  { key: 'alle', label: 'Alle' },
  { key: 'petition', label: 'Petitionen', Icon: ScrollText },
  { key: 'ehrenamt', label: 'Ehrenamt', Icon: HandHeart },
  { key: 'beteiligung', label: 'Stadt & Rat', Icon: Landmark },
] as const;

function daysLeft(deadline: string) {
  return Math.ceil((Date.parse(`${deadline}T23:59:59`) - Date.now()) / 86_400_000);
}

export function Opportunities() {
  const toast = useToast();
  const [items, setItems] = useState<Opportunity[]>();
  const [error, setError] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('alle');

  useEffect(() => {
    fetch('/api/opportunities').then((r) => r.json()).then((r) => (r.error ? setError(r.error) : setItems(r.items))).catch(() => setError('Keine Verbindung.'));
  }, []);

  const shown = useMemo(() => (items ?? []).filter((o) => type === 'alle' || o.type === type), [items, type]);

  const toggleSave = async (o: Opportunity) => {
    const saved = !o.saved;
    const set = (v: boolean) => setItems((list) => list?.map((i) => (i.id === o.id ? { ...i, saved: v } : i)));
    set(saved);
    const ok = await fetch('/api/saved', { method: 'POST', body: JSON.stringify({ kind: 'opportunity', itemId: o.id, saved }) }).then((r) => r.ok).catch(() => false);
    if (!ok) { set(!saved); toast('Das hat nicht geklappt'); } else toast(saved ? 'Gemerkt' : 'Nicht mehr gemerkt');
  };

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-label="Mitmachen in echt">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" role="group" aria-label="Art">
        {TYPES.map((t) => <Pill key={t.key} active={type === t.key} onClick={() => setType(t.key)}>{'Icon' in t && <t.Icon size={16} aria-hidden />}{t.label}</Pill>)}
      </div>
      {!items && !error && <><CardSkeleton /><CardSkeleton /></>}
      {error && <p role="alert" className="card font-semibold" style={{ color: 'var(--contra-text)' }}>{error}</p>}
      {shown.map((o, n) => {
        const left = o.deadline ? daysLeft(o.deadline) : undefined;
        return (
          <Reveal key={o.id} index={n}>
            <article className="card grid grid-cols-[minmax(0,1fr)] gap-2" data-testid="opportunity-card">
              <div className="flex items-center gap-2 flex-wrap">
                <SourceSeal kind={o.sourceKind} name={o.sourceName} />
                {o.forYou && <span className="chip" style={{ background: 'var(--honey-bg)', color: 'var(--honey-text)' }}>Für dich</span>}
                {o.liveNote && <span className="chip" style={{ background: 'var(--sage-bg)', color: 'var(--sage)' }}>{o.liveNote}</span>}
              </div>
              <h3 className="text-lg leading-snug">{o.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{o.summary}</p>
              {left !== undefined && (
                <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: left < 14 ? 'var(--ampel-red)' : 'var(--text)' }} title={o.deadlineNote}>
                  <CalendarClock size={16} aria-hidden />noch {left} {left === 1 ? 'Tag' : 'Tage'}
                </p>
              )}
              {o.deadlineNote && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{o.deadlineNote}</p>}
              {o.inApp && <Link href={o.inApp} className="btn-primary gap-2 !min-h-[48px] !py-2"><PenLine size={18} aria-hidden />Mit Kim schreiben</Link>}
              <div className="flex gap-2 items-center min-w-0">
                <a href={o.url} target="_blank" rel="noopener noreferrer" className={`${o.inApp ? 'btn-secondary' : 'btn-primary'} !w-auto flex-1 min-w-0 gap-2 !min-h-[48px] !py-2`}>
                  <ExternalLink size={18} aria-hidden />{o.type === 'petition' ? 'Zum Portal' : 'Öffnen'}
                </a>
                <IconButton label={o.saved ? 'Nicht mehr merken' : 'Merken'} onClick={() => toggleSave(o)}>
                  {o.saved ? <BookmarkCheck size={20} aria-hidden style={{ color: 'var(--primary)' }} /> : <Bookmark size={20} aria-hidden />}
                </IconButton>
              </div>
            </article>
          </Reveal>
        );
      })}
      <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>Mitzeichnen passiert auf der offiziellen Seite. OpenMind zeichnet nie für dich.</p>
    </section>
  );
}
