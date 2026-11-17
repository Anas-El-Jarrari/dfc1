'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CircleAlert, FilePen, MailCheck, Trash2 } from 'lucide-react';
import { IconButton, Reveal, useToast } from '@/ui';

interface Submission { id: string; type: string; subject: string; recipient: string; aiShare: number; status: string; sentAt: string }
interface Draft { id: string; type: string; title: string; step: number; updatedAt: string; content: { topicId?: string }; deliveryState?: string }

const TYPE: Record<string, string> = { antrag: 'Antrag', petition: 'Petition', stellungnahme: 'Stellungnahme', anregung: 'Anregung' };
const date = (s: string) => new Date(s.replace(' ', 'T') + (s.includes('T') ? '' : 'Z')).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Real letters the person sent from the app, and drafts they can continue. */
export function MyLetters() {
  const toast = useToast();
  const [subs, setSubs] = useState<Submission[]>();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    fetch('/api/submissions').then((r) => r.json()).then((r) => setSubs(r.submissions ?? [])).catch(() => setSubs([]));
    fetch('/api/drafts').then((r) => r.json()).then((r) => setDrafts(r.drafts ?? [])).catch(() => {});
  }, []);

  const remove = async (id: string) => {
    const ok = await fetch(`/api/drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => r.ok).catch(() => false);
    if (ok) setDrafts((list) => list.filter((d) => d.id !== id));
    toast(ok ? 'Entwurf gelöscht' : 'Das hat nicht geklappt');
  };

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-label="Meine Schreiben">
      {drafts.length > 0 && <h2 className="text-xl">Weiterschreiben</h2>}
      {drafts.map((d, i) => (
        <Reveal key={d.id} index={i}>
          <div className="card flex items-center gap-3" data-testid="draft-card">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--honey-bg)', color: 'var(--honey-text)' }}><FilePen size={22} aria-hidden /></span>
            <Link href={d.type === 'stellungnahme' && d.content.topicId ? `/thema/${d.content.topicId}/stellungnahme?entwurf=${d.id}` : `/mitmachen/antrag?entwurf=${d.id}`} className="flex-1 min-w-0">
              <strong className="block truncate">{d.title || TYPE[d.type]}</strong>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{TYPE[d.type]} · Schritt {d.step + 1}</span>
            </Link>
            {d.deliveryState && d.deliveryState !== 'failed' ? <span className="text-xs">Versand gesperrt · Gmail prüfen</span> : <IconButton label="Entwurf löschen" onClick={() => remove(d.id)}><Trash2 size={18} aria-hidden /></IconButton>}
          </div>
        </Reveal>
      ))}
      <h2 className="text-xl">Gesendet</h2>
      {subs && !subs.length && <p className="card" style={{ color: 'var(--text-secondary)' }}>Noch nichts gesendet. <Link href="/mitmachen/antrag" className="font-bold" style={{ color: 'var(--primary)' }}>Jetzt etwas verändern</Link></p>}
      {subs?.map((s, i) => (
        <Reveal key={s.id} index={i}>
          <article className="card grid gap-1" data-testid="sent-card">
            <span className="flex items-center gap-2 text-sm font-bold" style={{ color: s.status === 'gesendet' ? 'var(--sage)' : 'var(--ampel-red)' }}>
              {s.status === 'gesendet' ? <MailCheck size={16} aria-hidden /> : <CircleAlert size={16} aria-hidden />}{s.status === 'gesendet' ? 'Gesendet' : s.status === 'unklar' ? 'Versand unklar · Gmail prüfen, nicht erneut senden' : 'Abgelehnt'} · {date(s.sentAt)}
            </span>
            <strong>{s.subject}</strong>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{TYPE[s.type] ?? s.type} an {s.recipient} · KI-Anteil {s.aiShare} %</span>
          </article>
        </Reveal>
      ))}
    </section>
  );
}
