'use client';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Beipackzettel, Kim, TopBar } from '@/components/ui';
import type { KimPose } from '@/components/Kim';
import { useAppState } from '@/lib/store';
import { TOPICS, getTopic } from '@/lib/topics';
import type { GuardianResult } from '@/lib/types';
import { KimTip, Reveal } from '@/ui';
import { routeIntent, type KimMsg } from '@/features/kim/intent';
import { BookOpen, PenLine, SearchCheck } from 'lucide-react';


type Msg = { role: 'user'; content: string } | KimMsg;

/** Three ways in. Kim prepares; the person always decides and sends. */
const ACTIONS = [
  { href: '/mitmachen/antrag', title: 'Etwas verändern', text: 'Antrag oder Petition mit mir schreiben', Icon: PenLine },
  { href: '/entdecken', title: 'Thema verstehen', text: 'Beide Seiten, belegt', Icon: BookOpen },
  { href: '/check', title: 'Stimmt das?', text: 'Behauptung prüfen', Icon: SearchCheck },
];

const GREETING = (topic?: string): KimMsg => ({
  role: 'assistant',
  content: topic ? `Was möchtest du zu „${topic}“ wissen?` : 'Hallo, ich bin Kim. Frag mich zu einem Thema oder zur App.',
  pose: 'listen',
});

function KimBubble({ m }: { m: KimMsg }) {
  const sources = [...new Set((m.sources ?? []).map((s) => {
    const t = getTopic(s.topicId);
    return `[${s.id}] ${t?.corpus.find((c) => c.id === String(s.id))?.source ?? ''}`;
  }))];
  return (
    <div className="flex gap-2 items-start max-w-[92%]">
      <div className="shrink-0"><Kim pose={m.pose ?? 'listen'} size={40} /></div>
      <div className="grid gap-2">
        <p className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-white border" style={{ borderColor: 'var(--card-border)', ...(m.notice ? { background: 'var(--contra-bg)', color: 'var(--contra-text)' } : {}) }}>{m.content}</p>
        {sources.length > 0 && <ul className="text-xs pl-1" style={{ color: 'var(--text-secondary)' }}>{sources.map((s) => <li key={s}>{s}</li>)}</ul>}
        {(m.links ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {m.links!.map((l) => <Link key={l.href} href={l.href} className="value-chip min-h-[44px] flex items-center">{l.label} →</Link>)}
          </div>
        )}
        {m.guardian && <Beipackzettel sources={sources} aiShare={100} omitted="Aussagen ohne Beleg im Korpus" guardian={m.guardian} />}
      </div>
    </div>
  );
}

function Chat() {
  const topicId = useSearchParams().get('thema') ?? undefined;
  const topic = topicId ? getTopic(topicId) : undefined;
  const { update } = useAppState();
  const [msgs, setMsgs] = useState<Msg[]>([GREETING(topic?.shortTitle)]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setQ('');
    setBusy(true);
    update((s) => ({ ...s, chatLog: [...s.chatLog.slice(-19), text] }));
    const routed = topicId ? undefined : routeIntent(text);
    if (routed) {
      setMsgs((m) => [...m, routed]);
      setBusy(false);
      return;
    }
    // The greeting is UI only; the API conversation must start with the user.
    const history = next.slice(1).map((m) => ({ role: m.role, content: m.content }));
    const r = await fetch('/api/agents/kim', { method: 'POST', body: JSON.stringify({ messages: history, topicId }) })
      .then((x) => x.json())
      .catch(() => ({ error: 'Keine Verbindung' }));
    const reply: KimMsg = r.error || r.blocked
      ? { role: 'assistant', content: r.error ?? r.message, pose: 'unknown', notice: true }
      : { role: 'assistant', content: r.reply, sources: r.sources, links: r.links, pose: r.pose, guardian: r.guardian };
    setMsgs((m) => [...m, reply]);
    setBusy(false);
  };

  const starters = topic
    ? ['Erklär mir das kurz', 'Was sagt die Gegenseite?', 'Wer entscheidet?']
    : ['Was betrifft mich in Bilk?', 'Ich möchte eine Ampel am Schulweg', 'Was soll ich wählen?'];

  return (
    <>
      <TopBar label="Kim" right={msgs.length > 1 ? <button className="font-semibold min-h-[44px]" style={{ color: 'var(--primary)' }} onClick={() => setMsgs([GREETING(topic?.shortTitle)])}>Neu</button> : undefined} />
      <div className="px-4 pb-48 grid gap-4">
        <KimTip id="kim" bottom={152}>Frag mich alles. Eine Empfehlung bekommst du von mir nie.</KimTip>
        <div className="flex gap-2 flex-wrap">
          <span className="chip chip-stadt">{topic ? topic.shortTitle : `alle ${TOPICS.length} Themen`}</span>
          <span className="chip" style={{ background: 'var(--muted)', color: 'var(--text-secondary)' }}>nur belegte Antworten · keine Empfehlung</span>
        </div>
        {msgs.map((m, i) =>
          m.role === 'user'
            ? <p key={i} className="justify-self-end rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-white" style={{ background: 'var(--primary)' }}>{m.content}</p>
            : <KimBubble key={i} m={m} />,
        )}
        {busy && <div className="flex items-center gap-2" role="status"><Kim pose="search" size={40} /><span style={{ color: 'var(--text-secondary)' }}>Kim sucht …</span></div>}
        {msgs.length === 1 && !topic && (
          <div className="grid gap-3" data-tour="kim-actions">
            {ACTIONS.map((a, i) => (
              <Reveal key={a.href} index={i}>
                <Link href={a.href} className="card flex items-center gap-3 min-h-[72px]">
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><a.Icon size={24} aria-hidden /></span>
                  <span><strong className="text-lg block">{a.title}</strong><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.text}</span></span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
        {msgs.length === 1 && <div className="flex flex-wrap gap-2">{starters.map((s) => <button key={s} className="value-chip min-h-[44px]" onClick={() => send(s)}>{s}</button>)}</div>}
        <div ref={end} />
      </div>
      <form className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-2 flex gap-2" style={{ bottom: 84, background: 'var(--bg)' }} onSubmit={(e) => { e.preventDefault(); send(q); }}>
        <input className="search-input !pl-3 flex-1" aria-label="Nachricht an Kim" placeholder="Schreib Kim …" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary !w-auto !min-h-[48px] !py-2" disabled={busy || !q.trim()}>Senden</button>
      </form>
    </>
  );
}

export default function Page() {
  return <Suspense><Chat /></Suspense>;
}
