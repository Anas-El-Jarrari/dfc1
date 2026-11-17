'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import NeutralityCheck from '@/components/NeutralityCheck';
import SwipeSlider from '@/components/SwipeSlider';
import { Card, Kim, Progress, ProContra, TopBar } from '@/components/ui';
import data from '@/data/participation.json';
import { newRef, useAppState } from '@/lib/store';

function Support({ id }: { id: string }) {
  const p = data.petitions.find((x) => x.id === id)!;
  const { state, update } = useAppState();
  const done = state.supported.includes(id);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">{p.title}</h1>
      <ProContra pro={p.pro} contra={p.contra} proLabel="Für die Petition" contraLabel="Stärkste Gegenposition" />
      {done ? (
        <div className="grid justify-items-center gap-2"><Kim pose="done" size={96} /><span className="chip chip-stadt">Unterschrieben – von dir</span></div>
      ) : (
        <SwipeSlider label="Ja, unterschreiben →" onConfirm={() => update((s) => ({ ...s, supported: [...s.supported, id] }))} />
      )}
    </div>
  );
}

function Create() {
  const { update } = useAppState();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [ref, setRef] = useState('');
  const submit = () => {
    const id = newRef('P');
    setRef(id);
    update((s) => ({ ...s, submissions: [{ id, topicId: 'petition', topicTitle: title, type: 'petition', level: 'stadt', text, submittedAt: new Date().toISOString().slice(0, 10), status: 'eingereicht', referenceNumber: id }, ...s.submissions] }));
    setTimeout(() => setStep(3), 600);
  };
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Petition starten</h1>
      {step < 3 && <Progress step={step} total={2} labels={['Formulieren', 'Veröffentlichen']} />}
      {step === 1 && (
        <Card className="grid gap-3">
          <label className="screen-label" htmlFor="pt">Titel</label>
          <input id="pt" className="search-input !pl-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Mehr Bänke im Volksgarten" />
          <label className="screen-label" htmlFor="px">Forderung</label>
          <textarea id="px" rows={4} className="w-full rounded-xl p-3 border" style={{ borderColor: 'var(--card-border)' }} value={text} onChange={(e) => setText(e.target.value)} />
          <NeutralityCheck text={`${title}. ${text}`} onAccept={(t) => { setTitle(t); }} />
          <button className="btn-primary" disabled={!title.trim()} onClick={() => setStep(2)}>Weiter</button>
        </Card>
      )}
      {step === 2 && (
        <Card className="grid gap-3">
          <h2 className="text-lg">{title}</h2>
          <p className="text-sm">{text}</p>
          <span className="chip" style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)', width: 'fit-content' }}>Gegenposition wird neben deiner Petition angezeigt</span>
          <SwipeSlider label="Ja, so veröffentlichen →" onConfirm={submit} />
        </Card>
      )}
      {step === 3 && (
        <div className="grid gap-4 justify-items-center text-center pt-6">
          <Kim pose="done" size={120} />
          <span className="chip chip-stadt">Vorgang {ref}</span>
          <Link href="/wirkung" className="btn-primary">Wirkung verfolgen</Link>
        </div>
      )}
    </div>
  );
}

function Petition() {
  const id = useSearchParams().get('id');
  return (
    <>
      <TopBar label="S7 · Petition" back="/mitmachen" backLabel="Mitmachen" />
      <div className="px-4 pb-28">{id ? <Support id={id} /> : <Create />}</div>
    </>
  );
}

export default function Page() {
  return <Suspense><Petition /></Suspense>;
}
