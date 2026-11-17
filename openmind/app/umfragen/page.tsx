import Link from 'next/link';
import { Card, ProContra, TopBar } from '@/components/ui';
import data from '@/data/participation.json';

export default function Umfragen() {
  return (
    <>
      <TopBar label="S10 · Umfragen" back="/mitmachen" backLabel="Mitmachen" />
      <div className="px-4 pb-28 grid gap-5">
        <h1 className="text-3xl">Umfragen</h1>
        <section className="grid gap-3" aria-labelledby="off">
          <h2 id="off" className="text-lg flex items-center gap-2">Offiziell <span className="chip chip-stadt">von Behörden</span></h2>
          {data.officialSurveys.map((s) => (
            <Card key={s.id} className="grid gap-2">
              <p className="font-bold">{s.title}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.by} · {s.responses.toLocaleString('de-DE')} Antworten</p>
              <ProContra pro={s.pro} contra={s.contra} proLabel="Stärke" contraLabel="Kritik" />
            </Card>
          ))}
        </section>
        <section className="grid gap-3" aria-labelledby="buerger">
          <h2 id="buerger" className="text-lg flex items-center gap-2">Bürger-Umfragen <span className="chip" style={{ background: 'var(--honey-bg)', color: '#7A5E14' }}>nicht repräsentativ</span></h2>
          {data.citizenSurveys.map((s) => (
            <Link key={s.id} href="/mitmachen/umfrage" className="card grid gap-1">
              <p className="font-bold">{s.title}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.by}</p>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
