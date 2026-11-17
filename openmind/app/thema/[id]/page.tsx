'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { AmpelBadge, Beipackzettel, Card, Disclosure, Kim, LevelChip, Loading, ProContra, ReadAloud, TopBar } from '@/components/ui';
import { useAppState } from '@/lib/store';
import { formatDate, getTopic } from '@/lib/topics';
import type { ExplainLevel, ExplainResult, Topic, WeighResult } from '@/lib/types';

const LEVELS: Array<{ key: ExplainLevel; label: string }> = [
  { key: 'bilder', label: 'Bilder' }, { key: 'leicht', label: 'Leicht' }, { key: 'einfach', label: 'Einfach' }, { key: 'original', label: 'Original' },
];
const TENDENCIES = ['dafür', 'eher dafür', 'unentschieden', 'eher dagegen', 'dagegen'];
const VALUES = ['Sicherheit', 'Klima', 'Kosten', 'Familie', 'Parken', 'Ruhe', 'Gerechtigkeit'];

type Blocked = { blocked: true; message: string } | { error: string };
const isFail = (r: unknown): r is Blocked => typeof r === 'object' && r !== null && ('blocked' in r || 'error' in r);

function Step({ n, title, locked, children }: { n: number; title: string; locked?: boolean; children: React.ReactNode }) {
  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: locked ? '#B5AEA3' : 'var(--primary)' }}>{n}</span>
        <h2 className="text-xl">{title}</h2>
        {locked && <span className="chip ml-auto" style={{ background: 'var(--muted)', color: 'var(--text-secondary)' }} data-testid={`locked-${n}`}>gesperrt · erst du</span>}
      </div>
      {!locked && children}
    </Card>
  );
}

function Explain({ topic }: { topic: Topic }) {
  const { state } = useAppState();
  const [level, setLevel] = useState<ExplainLevel>(state.profile.easyLanguage ? 'leicht' : 'einfach');
  const [res, setRes] = useState<ExplainResult | Blocked | null>(null);
  useEffect(() => {
    setRes(null);
    fetch('/api/agents/explain', { method: 'POST', body: JSON.stringify({ topicId: topic.id, level }) })
      .then((r) => r.json()).then(setRes).catch(() => setRes({ error: 'Keine Verbindung' }));
  }, [topic.id, level]);
  const src = (id: string) => topic.corpus.find((c) => c.id === id);

  return (
    <>
      <div className="seg-tabs" role="tablist" aria-label="Sprachstufe">
        {LEVELS.map((l) => <button key={l.key} role="tab" aria-selected={level === l.key} className={`seg-tab min-h-[40px] ${level === l.key ? 'active' : ''}`} onClick={() => setLevel(l.key)}>{l.label}</button>)}
      </div>
      {/* Fixed minimum height: loading, answer and fallback take the same space, so "Erst du" below does not jump. */}
      <div className="grid gap-3 content-start min-h-[260px]">
      {!res && <Loading />}
      {res && isFail(res) && (
        <div className="grid gap-2">
          <span className="chip" style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)' }}>{'blocked' in res ? res.message : res.error}</span>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Originalquellen:</p>
          <ul className="text-sm list-disc pl-5">{topic.corpus.slice(0, 3).map((c) => <li key={c.id}>{c.text}</li>)}</ul>
        </div>
      )}
      {res && !isFail(res) && (
        <>
          <div className="flex justify-end"><ReadAloud text={res.sentences.map((s) => s.text).join(' ')} /></div>
          <ol className="list-decimal pl-5 grid gap-2">
            {res.sentences.map((s, i) => <li key={i}>{s.text} <sup style={{ color: 'var(--primary)' }}>[{s.sourceId}]</sup></li>)}
          </ol>
          <ul className="text-xs grid gap-0.5" style={{ color: 'var(--text-secondary)' }}>
            {[...new Set(res.sentences.map((s) => s.sourceId))].map((id) => <li key={id}>[{id}] {src(id)?.source}</li>)}
          </ul>
          <div className="flex gap-2 flex-wrap">
            <Disclosure label="Wer entscheidet?" tone="link">{topic.decisionMaker}</Disclosure>
            <Beipackzettel sources={res.sentences.map((s) => src(s.sourceId)?.source ?? '')} aiShare={100} omitted={`${topic.corpus.length - new Set(res.sentences.map((s) => s.sourceId)).size} von ${topic.corpus.length} Quellen nicht zitiert`} guardian={res.guardian} />
          </div>
        </>
      )}
      </div>
    </>
  );
}

function Weigh({ topic, tendency, values }: { topic: Topic; tendency: string; values: string[] }) {
  const [res, setRes] = useState<WeighResult | Blocked | null>(null);
  useEffect(() => {
    fetch('/api/agents/weigh', { method: 'POST', body: JSON.stringify({ topicId: topic.id, tendency, values }) })
      .then((r) => r.json()).then(setRes).catch(() => setRes({ error: 'Keine Verbindung' }));
  }, [topic.id, tendency, values]);
  if (!res) return <Loading text="Kim wägt beide Seiten ab …" />;
  if (isFail(res)) return <span className="chip" style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)' }}>{'blocked' in res ? res.message : res.error}</span>;
  return (
    <>
      <ProContra pro={res.pro.map((p) => p.text)} contra={res.contra.map((c) => c.text)} />
      <div className="rounded-2xl p-3 flex gap-3 items-start" style={{ border: '1.5px solid var(--contra)' }}>
        <Kim pose="counter" size={44} />
        <div>
          <p className="text-xs font-bold uppercase" style={{ color: 'var(--contra-text)' }}>Stärkstes Argument gegen deine Sicht</p>
          <p>{res.strongestCounter.text} <sup>[{res.strongestCounter.sourceId}]</sup></p>
        </div>
      </div>
      <div className="rounded-2xl p-3" style={{ background: 'var(--sage-bg)' }}>
        <div className="flex justify-between items-center mb-1">
          <p className="font-bold">Blick 2050</p>
          <span className="chip" style={{ background: 'white', color: 'var(--sage)' }}>{topic.blick2050.label}</span>
        </div>
        <p className="text-sm">{topic.blick2050.summary}</p>
        <Disclosure label="Mehr" tone="link"><ul className="list-disc pl-4">{topic.blick2050.details.map((d) => <li key={d}>{d}</li>)}</ul></Disclosure>
      </div>
      <Beipackzettel sources={[...res.pro, ...res.contra].map((a) => topic.corpus.find((c) => c.id === String(a.sourceId))?.source ?? '').filter((v, i, a) => v && a.indexOf(v) === i)} aiShare={100} omitted="Argumente ohne Beleg im Korpus" guardian={res.guardian} />
      <p className="text-sm font-semibold">Siehst du’s noch genauso? <Link href="#erst-du" style={{ color: 'var(--primary)' }}>Tendenz ändern</Link></p>
    </>
  );
}

export default function Themenseite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = getTopic(id);
  const { state, update } = useAppState();
  const saved = state.tendencies[id];
  const [tendency, setTendency] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>([]);
  if (!topic) notFound();
  const unlocked = Boolean(saved);

  const commit = () => {
    if (!tendency) return;
    update((s) => ({ ...s, tendencies: { ...s.tendencies, [id]: { tendency, values, at: new Date().toISOString() } } }));
  };

  return (
    <>
      <TopBar label="S3 · Themenseite" back="/entdecken" backLabel="Entdecken" />
      <div className="px-4 pb-28 grid gap-4">
        <div className="flex gap-2 flex-wrap"><LevelChip level={topic.level} />{topic.tags.map((t) => <span key={t} className="chip" style={{ background: 'var(--muted)', color: 'var(--text-secondary)' }}>{t}</span>)}</div>
        <h1 className="text-3xl">{topic.title}</h1>
        <p className="font-semibold">Beteiligung bis {formatDate(topic.deadline)}</p>
        <AmpelBadge ampel={topic.ampel} text={topic.ampelText} />

        <Step n={1} title="Verstehen"><Explain topic={topic} /></Step>

        <div id="erst-du">
          <Step n={2} title="Erst du">
            {unlocked && !tendency ? (
              <div className="flex justify-between items-center">
                <p>Deine Tendenz: <strong>{saved.tendency}</strong></p>
                <button className="font-semibold min-h-[44px]" style={{ color: 'var(--primary)' }} onClick={() => { setTendency(saved.tendency); setValues(saved.values); }}>Ändern</button>
              </div>
            ) : (
              <>
                <div className="flex gap-3 items-center">
                  <Kim pose="wait" size={56} />
                  <p className="font-semibold">Wie siehst du das gerade?</p>
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Deine Tendenz">
                  {TENDENCIES.map((t) => (
                    <button key={t} role="radio" aria-checked={tendency === t} onClick={() => setTendency(t)} className={`value-chip min-h-[44px] ${tendency === t ? 'selected' : ''}`}>{t}</button>
                  ))}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Was ist dir dabei wichtig?</p>
                <div className="flex flex-wrap gap-2">
                  {VALUES.map((v) => <button key={v} aria-pressed={values.includes(v)} onClick={() => setValues(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])} className={`value-chip min-h-[44px] ${values.includes(v) ? 'selected' : ''}`}>{v}</button>)}
                </div>
                <button className="btn-primary" disabled={!tendency} style={{ opacity: tendency ? 1 : 0.5 }} onClick={() => { commit(); setTendency(null); }}>Tendenz festhalten</button>
              </>
            )}
          </Step>
        </div>

        <Step n={3} title="Einordnen" locked={!unlocked}>{unlocked && <Weigh topic={topic} tendency={saved.tendency} values={saved.values} />}</Step>

        <Step n={4} title="Frag nach" locked={!unlocked}>
          <Link href={`/frag-nach?thema=${topic.id}`} className="btn-secondary">Frage zu diesem Thema stellen</Link>
        </Step>

        <Step n={5} title="Handeln" locked={!unlocked}>
          <Link href={`/thema/${topic.id}/stellungnahme`} className="btn-primary">Stellungnahme schreiben</Link>
          <Link href="/stimme" className="text-center font-semibold min-h-[44px] flex items-center justify-center" style={{ color: 'var(--primary)' }}>Nur Stimme anonym mitgeben</Link>
        </Step>
      </div>
    </>
  );
}
