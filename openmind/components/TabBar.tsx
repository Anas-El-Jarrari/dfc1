'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HandHeart, MessageCircleHeart, Sun, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import KimBase from './Kim';
import { useAppState } from '@/lib/store';

/** Four tabs. `match` lists every route that belongs to a tab, so deeper screens keep their tab lit. */
const TABS = [
  { href: '/entdecken', label: 'Heute', Icon: Sun, match: ['/entdecken', '/thema'] },
  { href: '/mitmachen', label: 'Mitmachen', Icon: HandHeart, match: ['/mitmachen', '/umfragen', '/stimme', '/engagieren'] },
  { href: '/frag-nach', label: 'Kim', Icon: MessageCircleHeart, match: ['/frag-nach', '/check'], kim: true },
  { href: '/ich', label: 'Ich', Icon: UserRound, match: ['/ich', '/wirkung', '/datenschutz'] },
];

/** Full-screen flows without navigation. */
const HIDDEN = ['/onboarding', '/tutorial', '/anmelden', '/ui', '/status'];

export default function TabBar() {
  const path = usePathname();
  const { state } = useAppState();
  if (path === '/' || HIDDEN.some((h) => path.startsWith(h))) return null;
  return (
    <nav className="tab-bar" aria-label="Hauptnavigation">
      {TABS.map((t) => {
        const active = t.match.some((m) => path.startsWith(m));
        return (
          <Link key={t.href} href={t.href} className={`tab-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
            {active && <motion.span layoutId="tab-indicator" className="tab-indicator" />}
            {t.kim && !state.profile.kimDisabled ? <KimBase pose="listen" size={26} /> : <t.Icon size={24} strokeWidth={2.2} aria-hidden />}
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
