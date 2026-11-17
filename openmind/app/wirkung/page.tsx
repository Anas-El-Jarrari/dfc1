'use client';
import { Fragment } from 'react';
import { Card, DemoSwitch, Disclosure, Kim, LevelChip, TopBar } from '@/components/ui';
import { useAppState } from '@/lib/store';
import type { Submission } from '@/lib/types';
import { MyLetters } from '@/features/write/MyLetters';

const STEPS: Submission['status'][] = ['eingereicht', 'in_pruefung', 'im_ausschuss', 'entschieden'];
const LABEL: Record<Submission['status'], string> = { eingereicht: 'eingereicht', in_pruefung: 'in Prüfung', im_ausschuss: 'im Ausschuss', entschieden: 'entschieden' };
const TYPE: Record<Submission['type'], string> = { stellungnahme: 'Stellungnahme', antrag: 'Antrag (§ 24 GO NRW)', petition: 'Petition', umfrage: 'Umfrage' };

function Timeline({ status }: { status: Submission['status'] }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-start" aria-label={`Status: ${LABEL[status]}`}>
      {STEPS.map((s, i) => (
        <Fragment key={s}>
          <div className="timeline-step">
            <div className={`timeline-dot ${i < idx || (i === idx && s === 'entschieden') ? 'done' : i === idx ? 'active' : ''}`} />
            <span className={`timeline-label ${i === idx ? 'active' : ''}`}>{LABEL[s]}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`timeline-line mt-[29px] ${i < idx ? 'done' : ''}`} style={{ marginTop: 9, marginBottom: 0 }} />}
        </Fragment>
      ))}
    </div>
  );
}

export default function Wirkung() {
  const { state, update } = useAppState();
  const subs = state.submissions;
  const advance = () =>
    update((s) => ({ ...s, submissions: s.submissions.map((x) => ({ ...x, status: STEPS[Math.min(STEPS.indexOf(x.status) + 1, 3)] })) }));

  return (
    <>
      <TopBar label="S12 · Wirkung" right={<DemoSwitch label="+14 Tage" onClick={advance} />} />
      <div className="px-4 pb-28 grid gap-4">
        <h1 className="text-3xl">Deine Wirkung</h1>
        <MyLetters />
        <h2 className="text-xl mt-2">Verlauf (Beispiel)</h2>
        <span className="chip" style={{ background: 'var(--muted)', color: 'var(--text-secondary)', width: 'fit-content' }}>Wie Sendungsverfolgung · kein Ranking</span>
        <div className="stat-row">
          <div className="stat-item"><div className="stat-num">{subs.length}</div><div className="stat-label">Beiträge</div></div>
          <div className="stat-item"><div className="stat-num">{subs.filter((s) => s.status !== 'entschieden').length}</div><div className="stat-label">laufend</div></div>
          <div className="stat-item"><div className="stat-num">{subs.filter((s) => s.status === 'entschieden').length}</div><div className="stat-label">entschieden</div></div>
        </div>
        {!subs.length && <div className="justify-self-center"><Kim pose="listen" size={80} /></div>}
        {subs.map((s) => (
          <Card key={s.id} className="grid gap-3" >
            <div className="flex justify-between"><span className="chip" style={{ background: 'var(--muted)', color: 'var(--text)' }}>{TYPE[s.type]}</span><LevelChip level={s.level} /></div>
            <h2 className="text-lg">{s.topicTitle}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.submittedAt} · Vorgang {s.referenceNumber}</p>
            <Timeline status={s.status} />
            {s.status === 'entschieden' ? (
              <Disclosure label="Entscheidung mit Begründung" tone="link">
                Dein Punkt wurde in der Vorlage aufgegriffen (Beispiel: Seite 4). Richtig wiedergegeben?
                <div className="flex gap-2 mt-2"><button className="value-chip min-h-[44px]">Ja</button><button className="value-chip min-h-[44px]">Nein</button></div>
              </Disclosure>
            ) : (
              <Disclosure label="Nächster Schritt" tone="link">{s.nextDate ?? 'Die Verwaltung prüft die Eingaben bis Fristende (Beispiel).'}</Disclosure>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
