import { BadgeCheck, HandHeart, Landmark, Newspaper, Users } from 'lucide-react';

export type SourceKind = 'amtlich' | 'presse' | 'faktencheck' | 'beteiligung' | 'zivilgesellschaft';

const KINDS: Record<SourceKind, { label: string; bg: string; color: string; Icon: typeof Landmark }> = {
  amtlich: { label: 'Amtlich', bg: 'var(--sage-bg)', color: 'var(--sage)', Icon: Landmark },
  presse: { label: 'Presse', bg: '#E4EDF2', color: '#35627F', Icon: Newspaper },
  faktencheck: { label: 'Faktencheck', bg: 'var(--honey-bg)', color: 'var(--honey-text)', Icon: BadgeCheck },
  beteiligung: { label: 'Beteiligung', bg: 'var(--primary-light)', color: 'var(--primary)', Icon: Users },
  zivilgesellschaft: { label: 'Zivilgesellschaft', bg: '#F1EAF3', color: '#6E4A7E', Icon: HandHeart },
};

/** Marks where a piece of content comes from. Only whitelisted sources get a seal. */
export function SourceSeal({ kind, name }: { kind: SourceKind; name?: string }) {
  const k = KINDS[kind];
  return (
    <span className="seal" style={{ background: k.bg, color: k.color }} title={`Geprüfte Quelle: ${k.label}`}>
      <k.Icon size={14} aria-hidden />
      {name ?? k.label}
    </span>
  );
}
