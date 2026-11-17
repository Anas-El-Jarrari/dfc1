'use client';
import Link from 'next/link';
import { FileText, Megaphone, MessageSquareText, Vote } from 'lucide-react';
import { Opportunities } from '@/features/mitmachen/Opportunities';
import { KimTip, Reveal } from '@/ui';

const START = [
  { href: '/mitmachen/antrag', title: 'Antrag stellen', chip: '§ 24 GO NRW', Icon: FileText },
  { href: '/mitmachen/petition', title: 'Petition starten', chip: 'Unterschriften', Icon: Megaphone },
  { href: '/mitmachen/umfrage', title: 'Eigene Umfrage', chip: 'nicht repräsentativ', Icon: MessageSquareText },
  { href: '/mitmachen/anregen', title: 'Umfrage anregen', chip: 'an die Stadt', Icon: Vote },
];

export default function Mitmachen() {
  return (
    <div className="px-4 pt-6 pb-28 grid grid-cols-[minmax(0,1fr)] gap-4">
      <h1 className="text-3xl">Mitmachen</h1>
      <KimTip id="mitmachen">Hier wirst du aktiv. Ich bereite vor, du sendest.</KimTip>

      <h2 className="text-xl">Selbst starten</h2>
      <div className="grid grid-cols-2 gap-3" data-tour="start">
        {START.map((s, i) => (
          <Reveal key={s.href} index={i}>
            <Link href={s.href} className="card grid gap-2 min-h-[112px] content-between h-full">
              <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><s.Icon size={22} aria-hidden /></span>
              <span className="font-extrabold leading-tight">{s.title}</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{s.chip}</span>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="flex justify-between items-center mt-2">
        <h2 className="text-xl">Jetzt mitmachen</h2>
        <Link href="/umfragen" className="font-bold min-h-[44px] flex items-center" style={{ color: 'var(--primary)' }}>Umfragen</Link>
      </div>
      <Opportunities />
    </div>
  );
}
