'use client';
import { useState } from 'react';
import { Card, Kim, TopBar } from '@/components/ui';
import data from '@/data/participation.json';

export default function Engagieren() {
  const [interest, setInterest] = useState<string[]>([]);
  return (
    <>
      <TopBar label="S15 · Engagieren" back="/mitmachen" backLabel="Mitmachen" />
      <div className="px-4 pb-28 grid gap-4">
        <h1 className="text-3xl">Engagieren</h1>
        <span className="chip chip-stadt w-fit">in deiner Nähe · Beispiele</span>
        {data.volunteering.map((v) => {
          const on = interest.includes(v.id);
          return (
            <Card key={v.id} className="grid gap-2">
              <div className="flex justify-between"><span className="chip" style={{ background: 'var(--muted)' }}>{v.type}</span><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{v.time}</span></div>
              <p className="font-bold">{v.title}</p>
              <button className={on ? 'btn-secondary' : 'btn-primary'} onClick={() => setInterest(on ? interest.filter((x) => x !== v.id) : [...interest, v.id])}>{on ? 'Gemerkt' : 'Merken'}</button>
            </Card>
          );
        })}
        {interest.length > 0 && <div className="flex items-center gap-2"><Kim pose="listen" size={44} /><span className="text-sm">Kontakt nimmst du selbst auf.</span></div>}
      </div>
    </>
  );
}
