'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Activity, ChevronRight, Download, LogOut, Repeat, ShieldCheck } from 'lucide-react';
import { Card, Disclosure, Kim, TopBar } from '@/components/ui';
import { useAppState } from '@/lib/store';
import { useSession } from '@/ui';
import GmailConnection from '@/components/GmailConnection';

const VALUES = ['Sicherheit', 'Klima', 'Familie', 'Kosten', 'Gerechtigkeit', 'Ruhe', 'Freiheit'];

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex justify-between items-center min-h-[48px]">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="w-6 h-6 accent-[#A84F33]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Drift alarm: if recent topic tendencies lean almost entirely one way, point it out – without judging which way. */
function drift(tendencies: Record<string, { tendency: string }>) {
  const t = Object.values(tendencies).map((x) => x.tendency);
  if (t.length < 3) return null;
  const pro = t.filter((x) => x.includes('dafür')).length / t.length;
  const con = t.filter((x) => x.includes('dagegen')).length / t.length;
  return pro >= 0.8 || con >= 0.8 ? 'Deine letzten Tendenzen zeigen alle in eine Richtung. Magst du die Gegenseite noch einmal ansehen?' : null;
}

export default function Ich() {
  const { state, update } = useAppState();
  const { user, logout, deleteAccount } = useSession();
  const [showData, setShowData] = useState(false);
  const p = state.profile;
  const set = (patch: Partial<typeof p>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const alarm = drift(state.tendencies);

  return (
    <>
      <TopBar label="S13 · Ich" />
      <div className="px-4 pb-28 grid gap-4">
        <div className="flex items-center gap-3">
          <Kim pose="listen" size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl truncate">{state.name || 'Ich'}</h1>
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }} data-testid="account-email">{user?.email}</p>
          </div>
          <button className="icon-btn" aria-label="Abmelden oder Konto wechseln" onClick={logout}><LogOut size={20} aria-hidden /></button>
        </div>

        <Link href="/wirkung" className="card flex items-center gap-3 min-h-[64px]">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Activity size={22} aria-hidden /></span>
          <span className="flex-1"><strong>Meine Wirkung</strong><br /><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{state.submissions.length} Beiträge</span></span>
          <ChevronRight aria-hidden style={{ color: 'var(--text-secondary)' }} />
        </Link>

        <Card className="grid gap-2">
          <label htmlFor="profile-location" className="font-bold">Dein Ort und Stadtteil</label>
          <input id="profile-location" className="search-input !pl-4" value={p.location} maxLength={80} placeholder="z. B. Düsseldorf · Rath" onChange={(e) => set({ location: e.target.value })} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kim übernimmt diesen Ort für die Recherche. Änderungen werden automatisch gespeichert.</p>
        </Card>
        <GmailConnection returnPath="/ich" />

        <Card className="grid gap-3">
          <h2 className="text-lg">Wertekompass</h2>
          <div className="flex flex-wrap gap-2">
            {VALUES.map((v) => <button key={v} aria-pressed={p.values.includes(v)} onClick={() => set({ values: p.values.includes(v) ? p.values.filter((x) => x !== v) : [...p.values, v] })} className={`value-chip min-h-[44px] ${p.values.includes(v) ? 'selected' : ''}`}>{v}</button>)}
          </div>
          {alarm ? <span className="chip" style={{ background: 'var(--honey-bg)', color: '#7A5E14' }} data-testid="drift">{alarm}</span> : <span className="chip chip-stadt w-fit">Drift-Alarm: alles ausgewogen</span>}
        </Card>

        <Card className="grid gap-1">
          <h2 className="text-lg">Einwilligungen</h2>
          <Toggle label="Profil zur Sortierung nutzen" checked={p.consentProfile} onChange={(v) => set({ consentProfile: v })} />
          <span className="chip" style={{ background: 'var(--muted)', color: 'var(--text-secondary)', width: 'fit-content' }}>Keine Weitergabe · keine Werbung</span>
        </Card>

        <Card className="grid gap-1">
          <h2 className="text-lg">Barrierefreiheit</h2>
          <Toggle label="Leichte Sprache" checked={p.easyLanguage} onChange={(v) => set({ easyLanguage: v })} />
          <Toggle label="Schlichter Modus (Kim aus)" checked={p.kimDisabled} onChange={(v) => set({ kimDisabled: v })} />
        </Card>

        <Link href="/tutorial" className="card flex items-center gap-3 min-h-[64px]">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sage-bg)', color: 'var(--sage)' }}><Repeat size={22} aria-hidden /></span>
          <strong className="flex-1">Tutorial wiederholen</strong>
          <ChevronRight aria-hidden style={{ color: 'var(--text-secondary)' }} />
        </Link>

        <Card className="grid gap-3">
          <h2 className="text-lg">Was weiß die KI über mich?</h2>
          <button className="btn-secondary" onClick={() => setShowData(!showData)}>{showData ? 'Ausblenden' : 'Ansehen'}</button>
          {showData && (
            <pre className="text-xs whitespace-pre-wrap rounded-xl p-3 max-h-64 overflow-auto" style={{ background: 'var(--muted)' }} data-testid="my-data">
              {JSON.stringify({ profil: p, tendenzen: state.tendencies, fragen: state.chatLog }, null, 2)}
            </pre>
          )}
          <a href="/api/me/export" download className="btn-secondary gap-2"><Download size={18} aria-hidden />Alle meine Daten herunterladen</a>
          <Link href="/datenschutz" className="font-bold min-h-[44px] flex items-center gap-2" style={{ color: 'var(--primary)' }}><ShieldCheck size={18} aria-hidden />Datenschutz in einfachen Worten</Link>
          <Disclosure label="Konto löschen" tone="link">
            <p className="mb-2">Dein Konto und alle Daten dazu werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
            <button className="btn-primary" style={{ background: 'var(--ampel-red)' }} onClick={deleteAccount}>Endgültig löschen</button>
          </Disclosure>
        </Card>
      </div>
    </>
  );
}
