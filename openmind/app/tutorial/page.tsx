'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Compass } from 'lucide-react';
import KimBase from '@/components/Kim';
import { tour } from '@/features/tour/store';
import { TOUR } from '@/features/tour/steps';
import { useAppState } from '@/lib/store';

/** Start screen of the short guided tour. */
export default function Tutorial() {
  const router = useRouter();
  const { update } = useAppState();
  // Enabled only once the page is interactive, so an early tap is never lost.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const chapters = [...new Set(TOUR.map((s) => s.chapter))].filter((c) => c !== 'Willkommen' && c !== 'Fertig');

  const start = () => {
    tour.start();
    router.push('/entdecken');
  };
  const skip = () => {
    update((s) => ({ ...s, tutorialDone: true }));
    router.push('/entdecken');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 pb-10 text-center">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><KimBase pose="listen" size={140} /></motion.div>
      <h1 className="text-3xl">Kleine Tour mit Kim</h1>
      <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Ein Rundgang durch die vier Bereiche. Etwa eine Minute.</p>
      <ul className="flex flex-wrap justify-center gap-2" aria-label="Kapitel">
        {chapters.map((c) => <li key={c} className="chip" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>{c}</li>)}
      </ul>
      <button className="btn-primary gap-2 mt-2" disabled={!ready} onClick={start}><Compass size={20} aria-hidden />Tour starten</button>
      <button className="font-bold min-h-[44px]" style={{ color: 'var(--primary)' }} disabled={!ready} onClick={skip}>Überspringen</button>
    </div>
  );
}
