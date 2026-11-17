'use client';
import { useState } from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import KimBase, { type KimPose } from '@/components/Kim';
import SwipeSlider from '@/components/SwipeSlider';
import { ProContra } from '@/components/ui';
import { CardSkeleton, IconButton, Pill, Reveal, Sheet, SourceSeal, useToast } from '@/ui';

const POSES: KimPose[] = ['listen', 'search', 'counter', 'unknown', 'wait', 'done'];
const COLORS = ['--bg', '--card', '--muted', '--primary', '--primary-bright', '--primary-light', '--sage', '--sage-bg', '--honey', '--honey-bg', '--text', '--text-secondary'];

/** Living style guide: every building block on one page. */
export default function UiPage() {
  const toast = useToast();
  const [filter, setFilter] = useState('Verkehr');
  const [sheet, setSheet] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <div className="p-4 pb-16 grid gap-6">
      <h1 className="text-3xl">Bausteine</h1>

      <section className="grid gap-3">
        <h2 className="text-lg">Farben</h2>
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => (
            <div key={c} className="grid gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="h-12 rounded-2xl" style={{ background: `var(${c})`, boxShadow: 'var(--shadow)' }} />
              {c.slice(2)}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg">Kim</h2>
        <div className="flex flex-wrap gap-3">{POSES.map((p) => <KimBase key={p} pose={p} size={52} />)}</div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg">Karten</h2>
        {['Radwege in Bilk', 'Ganztagsplätze'].map((t, i) => (
          <Reveal key={t} index={i}>
            <div className="card grid gap-2">
              <SourceSeal kind="amtlich" name="Stadt Düsseldorf" />
              <strong className="text-lg">{t}</strong>
              <div className="flex gap-2">
                <IconButton label="Merken" onClick={() => toast('Gemerkt')}><Bookmark size={20} aria-hidden /></IconButton>
                <IconButton label="Teilen" onClick={() => toast('Link kopiert')}><Share2 size={20} aria-hidden /></IconButton>
              </div>
            </div>
          </Reveal>
        ))}
        <CardSkeleton />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg">Siegel</h2>
        <div className="flex flex-wrap gap-2">
          <SourceSeal kind="amtlich" /><SourceSeal kind="presse" /><SourceSeal kind="faktencheck" /><SourceSeal kind="beteiligung" />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg">Filter</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Verkehr', 'Bildung', 'Umwelt', 'Wohnen'].map((f) => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg">Beide Seiten</h2>
        <ProContra pro={['Sicherer Schulweg']} contra={['Weniger Parkplätze']} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg">Knöpfe</h2>
        <button className="btn-primary" onClick={() => setSheet(true)}>Sheet öffnen</button>
        <button className="btn-secondary" onClick={() => toast('Hallo von Kim')}>Toast zeigen</button>
        <SwipeSlider key={round} onConfirm={() => { toast('Eingereicht'); setTimeout(() => setRound((r) => r + 1), 1500); }} />
      </section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Kurz erklärt">
        <p className="mb-4">Zieh mich nach unten oder tipp daneben.</p>
        <button className="btn-primary" onClick={() => setSheet(false)}>Schließen</button>
      </Sheet>
    </div>
  );
}
