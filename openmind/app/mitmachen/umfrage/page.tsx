'use client';
import Link from 'next/link';
import { useState } from 'react';
import NeutralityCheck from '@/components/NeutralityCheck';
import SwipeSlider from '@/components/SwipeSlider';
import { Card, DemoSwitch, Disclosure, Kim, ProContra, TopBar } from '@/components/ui';
import data from '@/data/participation.json';
import { useAppState } from '@/lib/store';
import { distribute, surveyResults } from '@/lib/survey';

export default function EigeneUmfrage() {
  const s = data.citizenSurveys[0];
  const { state, update } = useAppState();
  const [question, setQuestion] = useState('Bist du auch gegen die unsinnigen Radwege?');
  const [created, setCreated] = useState(false);
  const total = state.surveyAnswers[s.id] ?? 0;
  const res = surveyResults(distribute(total, s.seed));

  return (
    <>
      <TopBar label="S8 · Eigene Umfrage" back="/mitmachen" backLabel="Mitmachen" right={<DemoSwitch label="+5 Antworten" onClick={() => update((x) => ({ ...x, surveyAnswers: { ...x.surveyAnswers, [s.id]: (x.surveyAnswers[s.id] ?? 0) + 5 } }))} />} />
      <div className="px-4 pb-28 grid gap-4">
        <h1 className="text-3xl">Eigene Umfrage</h1>

        <Card className="grid gap-3">
          <label className="screen-label" htmlFor="q">Deine Frage</label>
          <textarea id="q" rows={2} className="w-full rounded-xl p-3 border" style={{ borderColor: 'var(--card-border)' }} value={question} onChange={(e) => setQuestion(e.target.value)} />
          <NeutralityCheck text={question} onAccept={setQuestion} />
          {created ? <span className="chip chip-stadt w-fit">Veröffentlicht (Beispiel)</span> : <SwipeSlider label="Ja, so veröffentlichen →" onConfirm={() => setCreated(true)} />}
        </Card>

        <Card className="grid gap-3" >
          <div className="flex justify-between items-center gap-2">
            <h2 className="text-lg">{s.title}</h2>
            <span className="chip" style={{ background: 'var(--honey-bg)', color: '#7A5E14' }}>nicht repräsentativ</span>
          </div>
          <p className="text-sm">{s.question}</p>
          {res.visible ? (
            <ul className="grid gap-2" data-testid="survey-results">
              {s.options.map((o, i) => (
                <li key={o}>
                  <div className="flex justify-between text-sm"><span>{o}</span><span>{res.percents[i]} %</span></div>
                  <div className="h-2 rounded" style={{ background: 'var(--track)' }}><div className="h-full rounded" style={{ width: `${res.percents[i]}%`, background: 'var(--pro)' }} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3" data-testid="survey-locked">
              <Kim pose="wait" size={48} />
              <p className="text-sm">{res.total} Antworten · Ergebnisse ab 20 (noch {res.missing})</p>
            </div>
          )}
          <Disclosure label="Wer fehlt?" tone="link">Bisher fast nur 25–45 Jahre, kaum Menschen ohne Smartphone, keine Antworten aus Bilk-Süd (Beispiel).</Disclosure>
          <ProContra pro={s.pro} contra={s.contra} proLabel="Stärke" contraLabel="Grenze" />
        </Card>
        <Link href="/umfragen" className="font-semibold min-h-[44px] flex items-center" style={{ color: 'var(--primary)' }}>Alle Umfragen</Link>
      </div>
    </>
  );
}
