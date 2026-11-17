'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Baby, Bike, Briefcase, ChevronLeft, Cpu, GraduationCap, HeartPulse, House, Leaf } from 'lucide-react';
import { Kim, Progress } from '@/components/ui';
import { useAppState } from '@/lib/store';
import { flushProfile } from '@/lib/store';

const INTERESTS = [
  { name: 'Verkehr', Icon: Bike }, { name: 'Kinder', Icon: Baby }, { name: 'Klima', Icon: Leaf }, { name: 'Wohnen', Icon: House },
  { name: 'Arbeit', Icon: Briefcase }, { name: 'Bildung', Icon: GraduationCap }, { name: 'Gesundheit', Icon: HeartPulse }, { name: 'Technologie', Icon: Cpu },
];
const DISTRICTS = ['Bilk', 'Flingern', 'Pempelfort', 'Oberkassel', 'Derendorf', 'Unterbilk', 'Friedrichstadt', 'Eller', 'Gerresheim', 'Benrath'];
const VALUES = ['Sicherheit', 'Klima', 'Familie', 'Kosten', 'Gerechtigkeit', 'Ruhe', 'Freiheit'];
const STEPS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { state, update } = useAppState();
  const router = useRouter();
  const p = state.profile;
  const [mailError, setMailError] = useState('');

  const setProfile = (patch: Partial<typeof p>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const district = p.location.replace(/^Düsseldorf-/, '');

  const finish = async () => {
    update((s) => ({ ...s, onboarded: true }));
    try { await flushProfile(); } catch { setMailError('Dein Profil konnte nicht gespeichert werden. Bitte erneut versuchen.'); return; }
    router.push(state.tutorialDone ? '/entdecken' : '/tutorial');
  };

  return (
    <div className="min-h-screen flex flex-col pb-8">
      <header className="px-4 pt-5 grid gap-3">
        <Progress step={step} total={STEPS} />
        <div className="flex justify-between items-center min-h-[44px]">
          {step > 1 ? <button aria-label="Zurück" className="icon-btn" onClick={() => setStep(step - 1)}><ChevronLeft aria-hidden /></button> : <span />}
          <button onClick={() => finish()} className="font-bold min-h-[44px]" style={{ color: 'var(--primary)' }}>Überspringen</button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={step} className="flex-1 px-6 flex flex-col items-center justify-center text-center gap-5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
          {step === 1 && (
            <>
              <Kim pose="listen" size={140} />
              <h1 className="text-3xl">Hallo, ich bin Kim.</h1>
              <label className="w-full text-left grid gap-1">
                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Wie darf ich dich nennen? (freiwillig)</span>
                <input className="search-input !pl-4" autoComplete="given-name" placeholder="Dein Name" value={state.name} onChange={(e) => update((s) => ({ ...s, name: e.target.value }))} />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-2xl">Wo wohnst du?</h1>
              <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Stadtteil">
                {DISTRICTS.map((d) => <button key={d} aria-pressed={district === d} className={`value-chip min-h-[44px] ${district === d ? 'selected' : ''}`} onClick={() => setProfile({ location: `Düsseldorf-${d}` })}>{d}</button>)}
              </div>
              <label className="w-full text-left grid gap-1">
                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Oder anderer Ort</span>
                <input className="search-input !pl-4" value={p.location} onChange={(e) => setProfile({ location: e.target.value })} />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-2xl">Was interessiert dich?</h1>
              <div className="grid grid-cols-2 gap-3 w-full" role="group" aria-label="Interessen">
                {INTERESTS.map(({ name, Icon }) => {
                  const on = p.interests.includes(name);
                  return (
                    <button key={name} aria-pressed={on} className="card flex flex-col items-center gap-2 !py-4 font-bold" style={on ? { background: 'var(--primary-light)', color: 'var(--primary)', boxShadow: '0 0 0 2px var(--primary)' } : undefined} onClick={() => setProfile({ interests: toggle(p.interests, name) })}>
                      <Icon size={28} aria-hidden />
                      {name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h1 className="text-2xl">Was ist dir wichtig?</h1>
              <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Werte">
                {VALUES.map((v) => <button key={v} aria-pressed={p.values.includes(v)} className={`value-chip min-h-[44px] ${p.values.includes(v) ? 'selected' : ''}`} onClick={() => setProfile({ values: toggle(p.values, v) })}>{v}</button>)}
              </div>
              <label className="card w-full flex items-center justify-between min-h-[56px]">
                <span className="font-bold">Leichte Sprache</span>
                <input type="checkbox" role="switch" className="w-6 h-6 accent-[#A84F33]" checked={p.easyLanguage} onChange={(e) => setProfile({ easyLanguage: e.target.checked })} />
              </label>
            </>
          )}
          {step === 5 && (
            <>
              <Kim pose="wait" size={96} />
              <h1 className="text-2xl">Wohin gehen deine Schreiben?</h1>
              <p>Kim recherchiert die zuständige Stelle für dein Anliegen. Du prüfst Kontakt, Betreff und Nachricht vor jedem Versand.</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dein Gmail-Konto verbindest du später unter „Ich“ oder vor dem ersten Versand. Bei Onlineformularen führt dich ein Link zum offiziellen Portal.</p>
              {mailError && <p role="alert" className="rounded-2xl px-4 py-3 text-sm font-semibold w-full" style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)' }}>{mailError}</p>}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="px-4">
        <button className="btn-primary" onClick={() => (step < STEPS ? setStep(step + 1) : finish())}>{step < STEPS ? 'Weiter' : 'Fertig'}</button>
      </div>
    </div>
  );
}
