'use client';
import { Suspense, use } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { WriteFlow } from '@/features/write/WriteFlow';
import { getTopic } from '@/lib/topics';

function Stellungnahme({ id }: { id: string }) {
  const draft = useSearchParams().get('entwurf') ?? undefined;
  return <WriteFlow mode="stellungnahme" topicId={id} draftId={draft} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  if (!getTopic(id)) notFound();
  return <Suspense><Stellungnahme id={id} /></Suspense>;
}
