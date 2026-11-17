'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WriteFlow } from '@/features/write/WriteFlow';

function Antrag() {
  const p = useSearchParams();
  return <WriteFlow mode="antrag" draftId={p.get('entwurf') ?? undefined} initialText={p.get('text') ?? ''} tour={p.get('tour') === '1'} />;
}

export default function Page() {
  return <Suspense><Antrag /></Suspense>;
}
