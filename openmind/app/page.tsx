'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KimBase from '@/components/Kim';
import { useAppState } from '@/lib/store';
import { useSession } from '@/ui';

export default function Start() {
  const { state, ready } = useAppState();
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status !== 'in' || !ready) return;
    router.replace(!state.onboarded ? '/onboarding' : !state.tutorialDone ? '/tutorial' : '/entdecken');
  }, [status, ready, state.onboarded, state.tutorialDone, router]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <KimBase pose="listen" size={140} />
      <h1 className="text-3xl">OpenMind</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Deine Stimme. Deine Entscheidung.</p>
      {status === 'out' && <Link href="/anmelden" className="btn-primary mt-4">Loslegen</Link>}
    </div>
  );
}
