'use client';
import Link from 'next/link';
import { useState } from 'react';
import SwipeSlider from '@/components/SwipeSlider';
import { Card, Disclosure, Kim, TopBar } from '@/components/ui';
import { TOPICS } from '@/lib/topics';

const OPTIONS = ['dafür', 'unentschieden', 'dagegen'];

export default function Stimme() {
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const [choice, setChoice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const topic = TOPICS.find((t) => t.id === topicId)!;

  return (
    <>
      <TopBar label="S14 · Stimme mitgeben" back="/entdecken" backLabel="Entdecken" />
      <div className="px-4 pb-28 grid gap-4">
        <h1 className="text-3xl">Stimme anonym mitgeben</h1>
        <div className="flex gap-2 flex-wrap"><span className="chip chip-stadt">anonym</span><span className="chip" style={{ background: 'var(--honey-bg)', color: '#7A5E14' }}>Meinungsbild, keine Abstimmung</span></div>
        {done ? (
          <div className="grid justify-items-center gap-3 pt-6 text-center">
            <Kim pose="done" size={110} />
            <p className="font-semibold">Deine Stimme ist im Meinungsbild.</p>
            <Link href="/entdecken" className="btn-primary">Zurück zu Entdecken</Link>
          </div>
        ) : (
          <Card className="grid gap-3">
            <label className="screen-label" htmlFor="th">Thema</label>
            <select id="th" className="search-input !pl-3 min-h-[48px]" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.shortTitle}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Deine Stimme">
              {OPTIONS.map((o) => <button key={o} role="radio" aria-checked={choice === o} onClick={() => setChoice(o)} className={`value-chip !rounded-xl min-h-[52px] ${choice === o ? 'selected' : ''}`}>{o}</button>)}
            </div>
            <Disclosure label="Was wird gespeichert?" tone="link">Nur die Stimme und der Stadtteil. Kein Name, keine Geräte-ID (Beispiel).</Disclosure>
            <SwipeSlider label="Ja, so mitgeben →" disabled={!choice} onConfirm={() => { setTimeout(() => setDone(true), 500); }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{topic.title}</p>
          </Card>
        )}
      </div>
    </>
  );
}
