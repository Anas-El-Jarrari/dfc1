'use client';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AmpelBadge, Beipackzettel, Kim, LevelChip, ReadAloud, WhyShown } from '@/components/ui';
import { useAppState } from '@/lib/store';
import { TOPICS, formatDate, rankTopics, whyShown } from '@/lib/topics';
import type { Level, Topic } from '@/lib/types';
import { NewsFeed } from '@/features/news/NewsFeed';
import { KimTip } from '@/ui';

const FILTERS: Array<{ key: Level | 'alle'; label: string }> = [
  { key: 'alle', label: 'Alle' }, { key: 'stadt', label: 'Stadt' }, { key: 'land', label: 'Land' }, { key: 'bund', label: 'Bund' }, { key: 'eu', label: 'EU' },
];

function TopicCard({ t, interests }: { t: Topic; interests: string[] }) {
  return (
    <article className="card grid gap-3" data-testid="topic-card">
      <div className="flex justify-between items-center"><LevelChip level={t.level} /><AmpelBadge ampel={t.ampel} /></div>
      <Link href={`/thema/${t.id}`} className="text-xl font-bold">{t.title}</Link>
      <p className="text-sm font-semibold">◷ {t.deadlineText ?? `Beteiligung bis ${formatDate(t.deadline)}`}</p>
      <div>
        <div className="flex h-2 rounded overflow-hidden" aria-hidden>
          <div style={{ width: `${t.stats.pro}%`, background: 'var(--pro)' }} />
          <div style={{ width: `${t.stats.contra}%`, background: 'var(--contra)' }} />
          <div className="flex-1" style={{ background: 'var(--track)' }} />
        </div>
        <p className="text-sm mt-1.5"><span style={{ color: 'var(--pro)' }}>dafür {t.stats.pro} %</span> · <span style={{ color: 'var(--contra-text)' }}>dagegen {t.stats.contra} %</span> · <span className="chip" style={{ background: 'var(--muted)', color: 'var(--text-secondary)' }}>nicht repräsentativ</span></p>
      </div>
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <Beipackzettel sources={t.corpus.map((c) => c.source)} aiShare={0} omitted="Stimmen von Nicht-Nutzer*innen" />
        <WhyShown reasons={whyShown(t, interests)} />
      </div>
    </article>
  );
}

function Briefing({ topics, onClose }: { topics: Topic[]; onClose: () => void }) {
  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="briefing-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Kim pose="listen" size={64} />
          <div>
            <h2 id="briefing-title" className="text-xl">3 Themen, die dich heute betreffen</h2>
            <span className="chip chip-stadt mt-1">ca. 60 Sek.</span>
          </div>
        </div>
        <ol className="grid gap-2 mb-5">
          {topics.slice(0, 3).map((t) => (
            <li key={t.id}>
              <Link href={`/thema/${t.id}`} className="card flex justify-between items-center min-h-[56px]">
                <span className="font-semibold">{t.shortTitle}</span>
                <LevelChip level={t.level} />
              </Link>
            </li>
          ))}
        </ol>
        <button className="btn-primary" onClick={onClose}>Alles ansehen</button>
      </div>
    </div>
  );
}

function greeting(name: string) {
  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend';
  return name ? `${hello}, ${name}` : hello;
}

function Entdecken() {
  const { state } = useAppState();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Level | 'alle'>('alle');
  const tabParam = params.get('tab') === 'themen' ? 'themen' : 'news';
  const [tab, setTab] = useState<'news' | 'themen'>(tabParam);
  // The tab can also change through the URL (links, the guided tour).
  useEffect(() => setTab(tabParam), [tabParam]);
  const ranked = useMemo(() => rankTopics(TOPICS, state.profile.interests, state.profile.location), [state.profile]);
  const shown = ranked.filter((t) => (filter === 'alle' || t.level === filter) && (t.title + t.tags.join(' ') + t.location).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="px-4 pt-6 pb-28 grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl">{greeting(state.name)}</h1>
          <ReadAloud text={shown.map((t) => t.title).join('. ')} />
        </div>
        <KimTip id="heute">Hier siehst du echte Nachrichten aus geprüften Quellen, passend zu dir.</KimTip>
        <div className="seg-tabs" role="tablist" aria-label="Heute">
          <button role="tab" aria-selected={tab === 'news'} className={`seg-tab min-h-[44px] ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>Neuigkeiten</button>
          <button role="tab" aria-selected={tab === 'themen'} className={`seg-tab min-h-[44px] ${tab === 'themen' ? 'active' : ''}`} onClick={() => setTab('themen')}>Zum Mitreden</button>
        </div>
        {tab === 'news' && <NewsFeed interests={state.profile.interests} />}
        {tab === 'themen' && <>
        <div className="search-wrapper">
          <span className="search-icon" aria-hidden>⌕</span>
          <input className="search-input" placeholder="Thema oder Ort suchen" aria-label="Suche" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Ebene">
          {FILTERS.map((f) => (
            <button key={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`value-chip min-h-[44px] ${filter === f.key ? 'selected' : ''}`}>{f.label}</button>
          ))}
        </div>
        <span className="chip" style={{ background: 'var(--muted)', color: 'var(--text-secondary)', width: 'fit-content' }}>Nach Betroffenheit & Frist – nie nach Meinung</span>
        {shown.map((t) => <TopicCard key={t.id} t={t} interests={state.profile.interests} />)}
        {!shown.length && <p style={{ color: 'var(--text-secondary)' }}>Nichts gefunden.</p>}
        </>}
      </div>
      {params.get('briefing') && <Briefing topics={ranked} onClose={() => router.replace('/entdecken')} />}
    </>
  );
}

export default function Page() {
  return <Suspense><Entdecken /></Suspense>;
}
