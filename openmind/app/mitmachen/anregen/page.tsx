'use client';
import SwipeSlider from '@/components/SwipeSlider';
import { Card, DemoSwitch, Kim, ProContra, TopBar } from '@/components/ui';
import data from '@/data/participation.json';
import { useAppState } from '@/lib/store';
import { useState } from 'react';

const STATUS = ['Unterschriften sammeln', 'An die Stadt übergeben', 'Stadt prüft', 'Umfrage beschlossen'];

export default function Anregen() {
  const i = data.initiatives[0];
  const { state, update } = useAppState();
  const [stage, setStage] = useState(0);
  const mine = state.supported.includes(i.id);
  const count = i.supporters + (mine ? 1 : 0) + stage * 120;

  return (
    <>
      <TopBar label="S9 · Offizielle Umfrage anregen" back="/mitmachen" backLabel="Mitmachen" right={<DemoSwitch label="Status weiter" onClick={() => setStage(Math.min(stage + 1, 3))} />} />
      <div className="px-4 pb-28 grid gap-4">
        <h1 className="text-3xl">Umfrage anregen</h1>
        <Card className="grid gap-3">
          <h2 className="text-lg">{i.title}</h2>
          <div className="h-2 rounded" style={{ background: 'var(--track)' }}><div className="h-full rounded" style={{ width: `${Math.min(100, (count / i.needed) * 100)}%`, background: 'var(--primary)' }} /></div>
          <p className="text-sm">{count} von {i.needed} Unterstützer*innen</p>
          <ol className="grid gap-1 text-sm">
            {STATUS.map((s, n) => <li key={s} className="flex gap-2 items-center"><span className="w-3 h-3 rounded-full" style={{ background: n <= stage ? 'var(--primary)' : 'var(--track)' }} />{s}</li>)}
          </ol>
          <ProContra pro={i.pro} contra={i.contra} />
        </Card>
        {mine ? (
          <div className="grid justify-items-center gap-2"><Kim pose="done" size={88} /><span className="chip chip-stadt">Du unterstützt das</span></div>
        ) : (
          <SwipeSlider label="Ja, unterstützen →" onConfirm={() => update((s) => ({ ...s, supported: [...s.supported, i.id] }))} />
        )}
      </div>
    </>
  );
}
