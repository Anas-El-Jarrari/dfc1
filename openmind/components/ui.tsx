'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import KimBase, { type KimPose } from './Kim';
import { useAppState } from '@/lib/store';
import type { Ampel, GuardianResult, Level } from '@/lib/types';

export function Kim({ pose, size }: { pose: KimPose; size?: number }) {
  const { state } = useAppState();
  if (state.profile.kimDisabled) return null;
  return <KimBase pose={pose} size={size} />;
}

const LEVEL_LABEL: Record<Level, string> = { stadt: 'Stadt', land: 'Land NRW', bund: 'Bund', eu: 'EU' };
export function LevelChip({ level }: { level: Level }) {
  return <span className={`chip chip-${level}`}>{LEVEL_LABEL[level]}</span>;
}

const AMPEL: Record<Ampel, { color: string; label: string; text?: string }> = {
  green: { color: '#4E7D3A', label: 'umkehrbar' },
  yellow: { color: '#B08A1E', label: 'schwer umkehrbar', text: '#7A5E14' },
  red: { color: '#A8432F', label: 'irreversibel' },
};
export function AmpelBadge({ ampel, text }: { ampel: Ampel; text?: string }) {
  const a = AMPEL[ampel];
  // #B08A1E is too light for text (3.2:1); it stays on the dot, the label uses a darker amber.
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: a.text ?? a.color }}>
      <span aria-hidden className="inline-block w-3 h-3 rounded-full" style={{ background: a.color }} />
      {text ?? a.label}
    </span>
  );
}

export function TopBar({ label, back, backLabel, right }: { label: string; back?: string; backLabel?: string; right?: ReactNode }) {
  return (
    <header className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between">
        {/* Screen numbers (S1 …) are for the spec, not for people. */}
        <span className="screen-label">{label.replace(/^S\d+\s*·\s*/, '')}</span>
        <span className="beispieldaten-badge">Beispieldaten</span>
      </div>
      {(back || right) && (
        <div className="flex items-center justify-between mt-3 min-h-[44px]">
          {back ? (
            <Link href={back} className="font-semibold min-h-[44px] flex items-center" style={{ color: 'var(--primary)' }}>
              ‹ {backLabel ?? 'Zurück'}
            </Link>
          ) : <span />}
          {right}
        </div>
      )}
    </header>
  );
}

export function ReadAloud({ text }: { text: string }) {
  const speak = () => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      speechSynthesis.speak(u);
    } catch {}
  };
  return (
    <button onClick={speak} aria-label="Vorlesen" className="w-11 h-11 rounded-xl bg-white border flex items-center justify-center" style={{ borderColor: 'var(--card-border)' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
    </button>
  );
}

/** Collapsed by default: a small badge, details on tap. */
export function Disclosure({ label, icon, children, tone = 'sage' }: { label: string; icon?: ReactNode; children: ReactNode; tone?: 'sage' | 'link' }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={tone === 'sage' ? 'beipackzettel-badge min-h-[44px]' : 'warum-badge min-h-[44px]'}>
        {icon}
        {label}
      </button>
      {open && <div className="mt-2 p-3 rounded-xl text-sm" style={{ background: 'var(--muted)' }}>{children}</div>}
    </div>
  );
}

const Shield = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" /><path d="m9 12 2 2 4-4" /></svg>;
const Info = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;

export function Beipackzettel({ sources, aiShare, omitted, guardian }: { sources: string[]; aiShare: number; omitted: string; guardian?: GuardianResult }) {
  return (
    <Disclosure label="Beipackzettel" icon={Shield}>
      <dl className="grid gap-2">
        <div><dt className="font-semibold">Quellen</dt><dd>{sources.length ? sources.join(' · ') : '–'}</dd></div>
        <div><dt className="font-semibold">KI-Anteil</dt><dd>{aiShare} %</dd></div>
        <div><dt className="font-semibold">Weggelassen</dt><dd>{omitted}</dd></div>
        <div>
          <dt className="font-semibold">Ethics Guardian</dt>
          <dd>{guardian ? (guardian.pass ? '✓ bestanden: keine Empfehlung, beide Seiten, belegt' : `✗ ${guardian.issues.map((i) => i.type).join(', ')}`) : 'Inhalt aus Datenbasis, nicht KI-generiert'}</dd>
        </div>
      </dl>
    </Disclosure>
  );
}

export function WhyShown({ reasons }: { reasons: string[] }) {
  return (
    <Disclosure label="Warum sehe ich das?" icon={Info} tone="link">
      <ul className="list-disc pl-4">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Sortiert nach Betroffenheit und Frist, nie nach Meinung.</p>
    </Disclosure>
  );
}

/** Pro and contra always the same size, max. 3 points each. */
export function ProContra({ pro, contra, proLabel = 'Dafür', contraLabel = 'Dagegen' }: { pro: string[]; contra: string[]; proLabel?: string; contraLabel?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="pro-contra">
      <div className="rounded-2xl p-3" style={{ background: 'var(--pro-bg)' }}>
        <p className="font-bold text-sm mb-2" style={{ color: 'var(--pro)' }}>{proLabel}</p>
        <ul className="text-sm space-y-1.5">{pro.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
      <div className="rounded-2xl p-3" style={{ background: 'var(--contra-bg)' }}>
        <p className="font-bold text-sm mb-2" style={{ color: 'var(--contra-text)' }}>{contraLabel}</p>
        <ul className="text-sm space-y-1.5">{contra.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
    </div>
  );
}

export function Progress({ step, total, labels }: { step: number; total: number; labels?: string[] }) {
  return (
    <div className="px-4">
      <div className="flex gap-2" role="progressbar" aria-label={`Schritt ${step} von ${total}`} aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="h-1 flex-1 rounded" style={{ background: i < step ? 'var(--primary)' : 'var(--track)' }} />
        ))}
      </div>
      {labels && <div className="flex text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>{labels.map((l, i) => <span key={i} className="flex-1">{l}</span>)}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function DemoSwitch({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="demo-toggle min-h-[36px]" onClick={onClick}>Demo: {label}</button>;
}

export function Loading({ text = 'Kim sucht in den Quellen …' }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-4" role="status">
      <Kim pose="search" size={48} />
      <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
    </div>
  );
}
