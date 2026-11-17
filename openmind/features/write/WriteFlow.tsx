'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Mail, PenLine, Sparkles } from 'lucide-react';
import KimBase from '@/components/Kim';
import OwnershipText from '@/components/OwnershipText';
import SwipeSlider from '@/components/SwipeSlider';
import GmailConnection from '@/components/GmailConnection';
import { Progress } from '@/components/ui';
import { PROCEDURES, STARTABLE, classifyByRules, getProcedure, templateLetter, type Procedure } from '@/core/procedures';
import type { ApplicationResult, StageEvent, UserIntent } from '@/core/research/types';
import { unansweredQuestions } from '@/core/research/intent';
import type { GmailStatus, MailPayload } from '@/core/gmail/types';
import { aiShareOf, mergeEdit, ownershipDiff, type Segment } from '@/lib/diff';
import { flushProfile, useAppState } from '@/lib/store';
import { getTopic } from '@/lib/topics';
import { Confetti, KimTip, useToast } from '@/ui';
import { DraftFactCheck } from './FactCheck';
import { AgentProgress, AgentResult } from './AgentResult';
import { TOUR_WRITE_EVENT } from '@/features/tour/store';

type Step = 'anliegen' | 'erst-du' | 'verfahren' | 'gegenseite' | 'fragen' | 'moeglichkeiten' | 'entwurf' | 'pruefen' | 'senden' | 'fertig';
export interface WriteFlowProps { mode: 'antrag' | 'stellungnahme'; topicId?: string; draftId?: string; initialText?: string; tour?: boolean }
interface Draft {
  id?: string; title: string; ownText: string; procedureId: string; answers: Record<string, string>; counter?: string;
  subject: string; segments: Segment[]; ai: boolean; agentRunId?: string; analysis?: ApplicationResult;
  recipientEmail?: string; recipientSourceUrl?: string;
  intent?: UserIntent; intentModel?: string; autoAnswers: Record<string, string>;
}
interface Review { reviewId: string; payload: MailPayload; expiresAt: number }
const STEPS: Record<WriteFlowProps['mode'], Step[]> = {
  antrag: ['anliegen', 'erst-du', 'verfahren', 'fragen', 'moeglichkeiten', 'entwurf', 'pruefen', 'senden'],
  stellungnahme: ['erst-du', 'gegenseite', 'fragen', 'moeglichkeiten', 'entwurf', 'pruefen', 'senden'],
};
const LABEL: Record<Step, string> = { anliegen: 'Anliegen', 'erst-du': 'Erst du', verfahren: 'Weg', gegenseite: 'Gegenseite', fragen: 'Details', moeglichkeiten: 'Möglichkeiten', entwurf: 'Entwurf', pruefen: 'Prüfen', senden: 'Bestätigen', fertig: 'Gesendet' };
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const bodyOf = (s: Segment[]) => s.map((x) => x.text).join('');
const titleFromText = (text: string) => text.trim().split(/[\n.!?]/)[0].trim().slice(0, 120);
export function wishSuggestions(text: string) {
  const value = text.toLocaleLowerCase('de-DE');
  if (/zebrastreifen|übergang|uebergang|schulweg|ampel|straße|strasse|kreuzung/.test(value)) return [
    'Bitte prüfen, ob ein sicherer Übergang eingerichtet werden kann.',
    'Bitte mögliche Lösungen wie Ampel oder Zebrastreifen prüfen.',
  ];
  if (/urin|stink|geruch|sauber|verschmutz|müll|muell|abfall|dreck/.test(value)) return [
    'Bitte die betroffene Stelle prüfen und bei Bedarf reinigen.',
    'Bitte die Ursache prüfen und mögliche Gegenmaßnahmen mitteilen.',
  ];
  if (/lärm|laerm|laut|nacht/.test(value)) return [
    'Bitte die Lärmsituation prüfen und mögliche Abhilfe mitteilen.',
    'Bitte prüfen, ob die bestehenden Regeln vor Ort eingehalten werden.',
  ];
  return [
    'Bitte die Situation vor Ort prüfen und mir mögliche Maßnahmen nennen.',
    'Bitte mitteilen, welche Stelle zuständig ist und wie es weitergeht.',
  ];
}
function tourExample(name: string): Draft {
  const p = getProcedure('anregung-24')!;
  const own = { title: 'Längere Grünphase an der Bilker Allee', ownText: 'Die Ampel an der Bilker allee ist für Kinder auf dem Schulweg zu kurz grün.', answers: { ort: 'Bilker Allee / Merowingerstraße', betroffen: 'Kinder', ziel: 'Längere Grünphase prüfen' } };
  const frame = templateLetter(p, { ...own, name });
  return { ...own, procedureId: p.id, subject: frame.subject, ai: true, segments: ownershipDiff(frame.body, frame.body.replace('Bilker allee', 'Bilker Allee')).segments, autoAnswers: {} };
}
async function jsonRequest(url: string, body?: unknown) {
  const response = await fetch(url, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok || result.error || result.blocked) {
    const error = new Error(result.error || result.message || 'Die Anfrage ist fehlgeschlagen.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return result;
}
export function WriteFlow({ mode, topicId, draftId, initialText = '', tour = false }: WriteFlowProps) {
  const toast = useToast();
  const { state, ready: profileReady } = useAppState();
  const topic = topicId ? getTopic(topicId) : undefined;
  const steps = STEPS[mode];
  const [step, setStep] = useState<Step>(steps[0]);
  const [d, setD] = useState<Draft>(() => tour ? tourExample(state.name) : {
    title: topic?.shortTitle || titleFromText(initialText), ownText: initialText, procedureId: mode === 'stellungnahme' ? 'stellungnahme' : '',
    answers: {}, subject: '', segments: [], ai: false, autoAnswers: {},
  });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [counterOptions, setCounterOptions] = useState<string[]>();
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [review, setReview] = useState<Review>();
  const [checked, setChecked] = useState(false);
  const [gmail, setGmail] = useState<GmailStatus>();
  const [sent, setSent] = useState<{ recipient: string }>();
  const [deliveryLocked, setDeliveryLocked] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const idRef = useRef<string | undefined>(draftId);
  const loaded = useRef(false);
  const sending = useRef(false);
  const queue = useRef<Promise<string | undefined>>(Promise.resolve(undefined));
  const location = useRef<string | undefined>(undefined);
  const procedure = getProcedure(d.procedureId);
  const suggestion = useMemo(() => classifyByRules(d.title + ' ' + d.ownText), [d.title, d.ownText]);
  const body = bodyOf(d.segments), aiShare = aiShareOf(d.segments), index = steps.indexOf(step);
  const openQuestions = unansweredQuestions(d.intent, d.answers);
  const visibleFields = procedure?.fields.filter((field) => Boolean(d.answers[field.key]?.trim())
    || !d.intent || d.intent.openQuestions.some((question) => question.field === field.key)) || [];
  const wishes = wishSuggestions(d.intent?.issue || d.title + ' ' + d.ownText);
  const report = (e: unknown) => setError(e instanceof Error ? e.message : 'Keine Verbindung. Dein Text bleibt erhalten.');

  useEffect(() => {
    if (!draftId || loaded.current) return;
    loaded.current = true;
    jsonRequest('/api/drafts').then((result) => {
      const row = result.drafts?.find((x: { id: string }) => x.id === draftId);
      if (!row) throw new Error('Der offene Entwurf wurde nicht gefunden. Gesendete Schreiben stehen unter Wirkung.');
      const c = row.content;
      setD({ ...c, id: row.id, title: row.title, ownText: row.ownText, procedureId: c.procedureId || '', answers: c.answers || {}, subject: c.subject || '', segments: c.segments || (c.body ? [{ text: c.body, ai: false }] : []), ai: Boolean(c.ai), intent: c.intent, intentModel: c.intentModel, autoAnswers: c.autoAnswers || {} });
      setStep(steps[Math.min(row.step, steps.length - 1)]);
      setDeliveryLocked(Boolean(row.deliveryState && row.deliveryState !== 'failed'));
    }).catch(report);
  }, [draftId, steps]);

  useEffect(() => {
    if (!profileReady || tour) return;
    if (location.current !== undefined && location.current !== state.profile.location) {
      version.current++; controller.current?.abort(); setBusy(''); setReview(undefined); setChecked(false);
      setD((cur) => ({ ...cur, analysis: undefined, agentRunId: undefined, recipientEmail: '', recipientSourceUrl: '', subject: '', segments: [], ai: false }));
      setError('Der Profilstandort wurde geändert. Recherchiere für den neuen Ort erneut.');
    }
    location.current = state.profile.location;
    // A saved analysis may be reopened after the profile location changed while the draft was closed.
    setD((cur) => cur.analysis && cur.analysis.location !== state.profile.location.trim()
      ? { ...cur, analysis: undefined, agentRunId: undefined, recipientEmail: '', recipientSourceUrl: '', subject: '', segments: [], ai: false } : cur);
  }, [profileReady, state.profile.location, tour]);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    if (!tour) return;
    const onStep = (e: Event) => setStep((e as CustomEvent<Step>).detail);
    window.addEventListener(TOUR_WRITE_EVENT, onStep);
    return () => window.removeEventListener(TOUR_WRITE_EVENT, onStep);
  }, [tour]);

  function change(patch: Partial<Draft>, researchChanged = false, rawTextChanged = false) {
    setReview(undefined); setChecked(false); setError('');
    if (rawTextChanged) {
      const answers = { ...d.answers };
      for (const [key, value] of Object.entries(d.autoAnswers)) if (answers[key] === value) delete answers[key];
      patch = { ...patch, answers, intent: undefined, intentModel: undefined, autoAnswers: {} };
    }
    if (researchChanged) {
      version.current++; controller.current?.abort(); setBusy('');
      patch = { ...patch, analysis: undefined, agentRunId: undefined, recipientEmail: '', recipientSourceUrl: '', subject: '', segments: [], ai: false };
    }
    setD((cur) => ({ ...cur, ...patch }));
  }
  function persist(next: Draft, atStep: Step): Promise<string | undefined> {
    if (tour) return Promise.resolve(undefined);
    const job = queue.current.catch(() => undefined).then(async () => {
      const r = await jsonRequest('/api/drafts', {
        id: next.id || idRef.current,
        type: mode === 'stellungnahme' ? 'stellungnahme' : getProcedure(next.procedureId)?.kind === 'petition' ? 'petition' : 'antrag',
        title: next.title, ownText: next.ownText, step: Math.max(0, steps.indexOf(atStep)),
        content: { procedureId: next.procedureId, topicId, answers: next.answers, counter: next.counter, intent: next.intent, intentModel: next.intentModel, autoAnswers: next.autoAnswers, subject: next.subject, body: bodyOf(next.segments), segments: next.segments,
          aiShare: aiShareOf(next.segments), ai: next.ai, agentRunId: next.agentRunId, recipientEmail: next.recipientEmail || '', recipientSourceUrl: next.recipientSourceUrl || '' },
      });
      idRef.current = r.draft.id;
      setD((cur) => ({ ...cur, id: r.draft.id }));
      return r.draft.id as string;
    });
    queue.current = job;
    return job;
  }
  async function go(to: Step, next = d) {
    setError(''); setStep(to);
    if (!deliveryLocked) await persist(next, to).catch(report);
  }
  function next() { void go(steps[index + 1]); }
  function back() {
    if (index <= 0) return;
    if (busy) { version.current++; controller.current?.abort(); setBusy(''); }
    void go(steps[index - 1]);
  }
  async function loadCounter() {
    if (counterOptions || !topic) return;
    try {
      const r = await jsonRequest('/api/agents/weigh', { topicId: topic.id, tendency: d.ownText.slice(0, 200), values: state.profile.values });
      setCounterOptions(r.strongestCounter ? [r.strongestCounter.text, ...(r.contra || []).map((c: { text: string }) => c.text)].slice(0, 3) : topic.corpus.slice(0, 3).map((c) => c.text));
    } catch { setCounterOptions(topic.corpus.slice(0, 3).map((c) => c.text)); }
  }
  async function understand(to: Step) {
    if (busy || !profileReady) return;
    if (d.ownText.trim().length < 10) { setError('Beschreibe kurz, was nicht stimmt oder was du verändern möchtest.'); return; }
    const task = ++version.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setBusy('Kim ordnet Problem, Wunsch und bereits genannte Angaben …'); setError('');
    try {
      await flushProfile();
      const inputDraft = { ...d, title: titleFromText(d.ownText) || d.title };
      const id = await persist(inputDraft, step);
      if (version.current !== task) return;
      const response = await fetch('/api/agents/intake', { method: 'POST', body: JSON.stringify({ draftId: id }), signal: abort.signal });
      const parsed = await response.json();
      if (!response.ok || parsed.error) throw new Error(parsed.error || 'Das Anliegen konnte nicht verstanden werden.');
      if (version.current !== task) return;
      const intent = parsed.intent as UserIntent;
      const answers = { ...d.answers }, autoAnswers = { ...d.autoAnswers };
      const fillIfEmpty = (key: string, value: string) => {
        if (value?.trim() && !answers[key]?.trim()) { answers[key] = value.trim(); autoAnswers[key] = value.trim(); }
      };
      fillIfEmpty('ort', intent.explicitLocation);
      fillIfEmpty('betroffen', intent.affected);
      fillIfEmpty('ziel', intent.goal);
      fillIfEmpty('details', intent.confirmedDetails.join('\n'));
      const procedureId = mode === 'antrag' && !d.procedureId ? classifyByRules(intent.issue + ' ' + d.ownText).procedure.id : d.procedureId;
      const updated: Draft = { ...inputDraft, id, title: intent.issue, procedureId, answers, autoAnswers, intent, intentModel: parsed.model,
        analysis: undefined, agentRunId: undefined, subject: '', segments: [], ai: false, recipientEmail: '', recipientSourceUrl: '' };
      await persist(updated, to);
      if (version.current !== task) return;
      setD(updated); setStep(to);
    } catch (e) { if (!abort.signal.aborted && version.current === task) report(e); }
    finally { if (version.current === task) setBusy(''); }
  }
  async function research(refresh = false) {
    if (tour) { setStep('entwurf'); return; }
    if (busy || !profileReady) return;
    if (!d.intent) { setError('Lass Kim zuerst dein Anliegen verstehen. Deine Eingabe bleibt erhalten.'); return; }
    const questions = unansweredQuestions(d.intent, d.answers);
    if (questions.length) { setError('Bitte beantworte noch: ' + questions.map((item) => item.question).join(' ')); return; }
    const task = ++version.current;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy('Kim recherchiert Quellen und Zuständigkeit …'); setError(''); setEvents([]); setReview(undefined); setChecked(false); setStep('moeglichkeiten');
    try {
      await flushProfile();
      const id = await persist(d, 'moeglichkeiten');
      const response = await fetch('/api/agents/application', { method: 'POST', body: JSON.stringify({ draftId: id, refresh }), signal: abort.signal });
      if (!response.ok) throw new Error((await response.json()).error || 'Recherche fehlgeschlagen.');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Die Recherche konnte nicht gestartet werden.');
      const decoder = new TextDecoder(); let buffer = '', completed = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          const line = block.split('\n').find((l) => l.startsWith('data: ')); if (!line) continue;
          const event = JSON.parse(line.slice(6));
          if (version.current !== task) return;
          if (event.type === 'stage') setEvents((cur) => [...cur, event]);
          if (event.type === 'error') throw new Error(event.error);
          if (event.type === 'complete') {
            const result = event.result as ApplicationResult;
            const contact = result.routing.contacts.find((c) => c.kind === 'email');
            const updated: Draft = { ...d, id, analysis: result, agentRunId: event.runId, subject: result.draft.subject,
              segments: ownershipDiff(d.ownText, result.draft.body).segments, ai: true, recipientEmail: contact?.value || '', recipientSourceUrl: result.sources.find((s) => s.id === contact?.sourceId)?.url || '' };
            setD(updated); await persist(updated, 'moeglichkeiten'); completed = true;
          }
        }
      }
      if (!completed && !abort.signal.aborted) throw new Error('Die Recherche wurde unterbrochen. Du kannst sie erneut starten.');
    } catch (e) { if (!abort.signal.aborted && version.current === task) report(e); }
    finally { if (version.current === task) setBusy(''); }
  }
  async function prepare() {
    if (busy || tour) return;
    setBusy('Kontakt und bearbeiteten Text prüfen …'); setError(''); setReview(undefined); setChecked(false);
    try {
      await flushProfile();
      const id = await persist(d, 'senden');
      const r = await jsonRequest('/api/mail/review', { draftId: id });
      setReview(r); setStep('senden');
    } catch (e) { report(e); }
    finally { setBusy(''); }
  }
  async function send() {
    if (!review || !checked || sending.current || tour || deliveryLocked) return false;
    sending.current = true; setBusy('Wird über Gmail gesendet …'); setError('');
    try {
      const r = await jsonRequest('/api/submissions', { reviewId: review.reviewId, confirmed: true });
      setSent({ recipient: r.submission.recipient }); setDeliveryLocked(true); setStep('fertig'); return true;
    } catch (e) {
      report(e); setReview(undefined); setChecked(false);
      const error = e as Error & { status?: number };
      if (error.status === 409 && /könnte gesendet|bereits gestartet|Ergebnis muss im Gmail-Ordner/i.test(error.message)) setDeliveryLocked(true);
      return false;
    }
    finally { sending.current = false; setBusy(''); }
  }
  async function beforeGmail() {
    await flushProfile();
    const id = await persist(d, step);
    return (mode === 'stellungnahme' && topicId ? '/thema/' + encodeURIComponent(topicId) + '/stellungnahme' : '/mitmachen/antrag') + '?entwurf=' + encodeURIComponent(id || '');
  }
  const canEmail = Boolean(d.analysis?.routing.method === 'email' && d.agentRunId);
  const forms = d.analysis?.routing.contacts.filter((c) => c.kind === 'form') || [];
  const contactSources = d.analysis?.sources.filter((s) => d.analysis?.routing.contacts.some((c) => c.kind === 'email' && c.sourceId === s.id)) || [];
  const selectedVerifiedEmail = d.analysis?.routing.contacts.find((contact) => contact.kind === 'email'
    && contact.value.toLowerCase() === (d.recipientEmail || '').trim().toLowerCase()
    && d.analysis?.sources.find((source) => source.id === contact.sourceId)?.url === d.recipientSourceUrl);
  function mailFields() {
    return <div className="grid gap-3">
      {canEmail && <>
        <div className="card grid gap-1" role="status">
          <strong>{selectedVerifiedEmail ? 'Empfänger auf Kontaktseite belegt' : 'Empfänger vor Versand prüfen'}</strong>
          <span className="break-all">{d.recipientEmail || 'Noch keine Adresse ausgewählt'}</span>
          {d.recipientSourceUrl && <a href={d.recipientSourceUrl} className="text-sm underline break-all" target="_blank" rel="noreferrer">{selectedVerifiedEmail ? 'Beleg auf Kontaktseite ansehen' : 'Gewählte Kontaktquelle ansehen'} ↗</a>}
          {!selectedVerifiedEmail && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Die Adresse wird nur verwendet, wenn sie auf der gewählten Kontaktseite steht. Vor dem Versand wird sie erneut abgerufen.</span>}
        </div>
        <label className="grid gap-1"><span className="text-sm font-bold">Empfänger</span><input type="email" className="search-input !pl-4" value={d.recipientEmail || ''} disabled={deliveryLocked || Boolean(busy)} onChange={(e) => change({ recipientEmail: e.target.value })} /></label>
        <label className="grid gap-1"><span className="text-sm font-bold">Kontaktquelle</span><select className="search-input !pl-4" value={d.recipientSourceUrl || ''} disabled={deliveryLocked || Boolean(busy)} onChange={(e) => change({ recipientSourceUrl: e.target.value })}><option value="">Quelle auswählen</option>{contactSources.map((s) => <option key={s.id} value={s.url}>{s.title}</option>)}</select></label>
        {d.recipientSourceUrl && <a href={d.recipientSourceUrl} className="text-sm underline break-all" target="_blank" rel="noreferrer">Kontaktquelle ansehen ↗</a>}
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Eine geänderte Adresse muss auf der gewählten Kontaktseite belegt sein.</p>
      </>}
      <label className="grid gap-1"><span className="text-sm font-bold">Betreff</span><input className="search-input !pl-4" value={d.subject} disabled={deliveryLocked || Boolean(busy)} onChange={(e) => change({ subject: e.target.value })} maxLength={200} /></label>
    </div>;
  }
  return <div className="px-4 pt-5 pb-28 grid grid-cols-[minmax(0,1fr)] gap-4">
    {step !== 'fertig' && <>
      <div className="flex items-center gap-2">{index > 0 ? <button className="icon-btn" aria-label="Zurück" onClick={back} disabled={sending.current}><ChevronLeft aria-hidden /></button> : <Link href={topic ? '/thema/' + topic.id : '/mitmachen'} className="icon-btn" aria-label="Abbrechen"><ChevronLeft aria-hidden /></Link>}<h1 className="text-2xl flex-1 truncate">{mode === 'stellungnahme' ? 'Stellungnahme' : 'Etwas verändern'}</h1></div>
      <Progress step={index + 1} total={steps.length} labels={steps.map((s) => s === step ? LABEL[s] : '')} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{state.profile.location || 'Kein Profilstandort'} · <Link className="underline" href="/ich">Ändern</Link></p>
      {topic && <span className="chip chip-stadt w-fit">{topic.shortTitle}</span>}
    </>}
    {deliveryLocked && step !== 'fertig' && <div role="alert" className="card">Für dieses Schreiben wurde der Versand bereits gestartet. <Link className="underline" href="/wirkung">Status unter Wirkung ansehen</Link>. Bei unklarem Status prüfe auch den Ordner „Gesendet“ in Gmail.</div>}
    {error && <ErrorBox text={error} />}
    {busy && step !== 'moeglichkeiten' && <div className="card" role="status">{busy}</div>}
    <AnimatePresence mode="wait">
      <motion.div key={step} className="grid gap-4 min-w-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
        {step === 'anliegen' && <>
          <KimTip id="antrag" bottom={16}>Ein Text reicht. Problem, gewünschte Änderung und wichtige Details kannst du in deinen Worten beschreiben.</KimTip>
          <label className="grid gap-2"><span className="text-xl font-extrabold">Was möchtest du verändern?</span><textarea aria-label="Was möchtest du verändern?" rows={6} maxLength={4000} className="card w-full text-base" placeholder="z. B. An meiner Straße fehlt ein sicherer Übergang zur Schule. Ich wünsche mir, dass die Stadt mögliche Lösungen prüft." value={d.ownText} onChange={(e) => change({ ownText: e.target.value, title: titleFromText(e.target.value) }, true, true)} /></label>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Du musst Problem und Wunsch nicht in getrennte Felder schreiben. Kim übernimmt Angaben, die du schon genannt hast.</p>
          <button className="btn-primary" disabled={d.ownText.trim().length < 10 || Boolean(busy)} onClick={() => understand('erst-du')}>Anliegen verstehen</button>
        </>}
        {step === 'erst-du' && mode === 'antrag' && <>
          <div className="flex items-center gap-3"><KimBase pose="listen" size={52} /><p className="font-extrabold text-lg">So habe ich dein Anliegen verstanden</p></div>
          {d.intent ? <>
            <label className="card grid gap-2"><span className="font-bold">Das Problem</span><textarea aria-label="Erkanntes Problem" rows={3} maxLength={400} value={d.intent.issue} onChange={(e) => change({ intent: { ...d.intent!, issue: e.target.value }, title: e.target.value }, true)} /></label>
            <div className="card grid gap-2"><strong>Dein ursprünglicher Text</strong><p className="whitespace-pre-wrap">{d.ownText}</p></div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ort aus deinem Profil: {state.profile.location || 'nicht angegeben'}{d.intent.explicitLocation ? ` · Ort aus deinem Text: ${d.intent.explicitLocation}` : ''}. Bekannte Angaben und konkrete Rückfragen kommen im nächsten Schritt.</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lokal verstanden mit {d.intentModel || 'Ollama'}.</p>
            <button className="btn-primary" onClick={next}>Weiter</button>
          </> : <><p>Das Anliegen wurde noch nicht eingelesen. Deine Eingabe bleibt erhalten.</p><button className="btn-primary" disabled={Boolean(busy)} onClick={() => understand('erst-du')}>Erneut verstehen</button></>}
        </>}
        {step === 'erst-du' && mode === 'stellungnahme' && <>
          <div className="flex items-center gap-3"><KimBase pose="listen" size={52} /><p className="font-extrabold text-lg">Wie ist es heute, und was wünschst du dir?</p></div>
          <textarea aria-label="In deinen Worten" rows={6} className="card w-full text-base" maxLength={4000} placeholder="Schreib Problem und Wunsch in einem Text. Ganz in deinen Worten." value={d.ownText} onChange={(e) => change({ ownText: e.target.value, title: titleFromText(e.target.value) }, true, true)} />
          <p className="text-sm">Bekannte Angaben werden übernommen. Fehlende wichtige Punkte fragt Kim gezielt nach.</p>
          <button className="btn-primary" disabled={d.ownText.trim().length < 10 || Boolean(busy)} onClick={() => understand(steps[index + 1])}>Anliegen verstehen</button>
        </>}
        {step === 'verfahren' && <>
          <p className="text-xl font-extrabold">Der passende Weg</p><p className="text-sm">Ein erster Vorschlag. Kim prüft anschließend, welcher Weg vor Ort passt.</p>
          {STARTABLE.map((p) => <ProcedureCard key={p.id} p={p} selected={d.procedureId === p.id} suggested={suggestion.procedure.id === p.id ? suggestion.reason : undefined} onSelect={() => change({ procedureId: p.id }, true)} />)}
          <button className="btn-primary" disabled={!procedure} onClick={next}>Passt</button>
        </>}
        {step === 'gegenseite' && <>
          <div className="flex items-center gap-3"><KimBase pose="counter" size={52} /><p className="font-extrabold text-lg">Das sagt die Gegenseite. Möchtest du darauf eingehen?</p></div>
          {!counterOptions && topic && <button className="btn-secondary" onClick={loadCounter}>Gegenseite laden</button>}
          {counterOptions?.map((c) => <button key={c} aria-pressed={d.counter === c} className="card text-left" onClick={() => change({ counter: d.counter === c ? undefined : c }, true)}>{c}</button>)}
          <button className="btn-primary" onClick={next}>{d.counter ? 'Darauf eingehen' : 'Ohne Gegenseite weiter'}</button>
        </>}
        {step === 'fragen' && procedure && <>
          <p className="text-xl font-extrabold">{openQuestions.length ? `Noch ${openQuestions.length} gezielte ${openQuestions.length === 1 ? 'Rückfrage' : 'Rückfragen'}` : 'Deine Angaben prüfen'}</p>
          {d.intent && <label className="card grid gap-2"><span className="font-bold">Das Problem</span><input aria-label="Das Problem" className="search-input !pl-4" maxLength={400} value={d.intent.issue} onChange={(e) => change({ intent: { ...d.intent!, issue: e.target.value }, title: e.target.value }, true)} /></label>}
          {!d.intent && <div className="card grid gap-2"><p>Kim hat deine Angaben noch nicht geordnet.</p><button className="btn-secondary" disabled={Boolean(busy)} onClick={() => understand('fragen')}>Anliegen verstehen</button></div>}
          {visibleFields.map((f) => {
            const question = d.intent?.openQuestions.find((item) => item.field === f.key);
            const value = d.answers[f.key] || '';
            return <div key={f.key} className="card grid gap-2">
              <label htmlFor={'f-' + f.key} className="font-bold">{question?.question || f.question}</label>
              {question?.reason && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{question.reason}</p>}
              {f.chips.length > 0 && <div className="flex flex-wrap gap-2">{f.chips.map((c) => <button key={c} type="button" className="pill !shadow-none" aria-pressed={value === c} onClick={() => change({ answers: { ...d.answers, [f.key]: c } }, true)}>{c}</button>)}</div>}
              {f.key === 'ziel'
                ? <textarea id={'f-' + f.key} aria-label={f.question} rows={3} className="search-input !pl-4" maxLength={500} placeholder={f.placeholder || 'In deinen Worten'} value={value} onChange={(e) => change({ answers: { ...d.answers, [f.key]: e.target.value } }, true)} />
                : <input id={'f-' + f.key} aria-label={f.question} className="search-input !pl-4" maxLength={500} placeholder={f.placeholder || 'In deinen Worten'} value={value} onChange={(e) => change({ answers: { ...d.answers, [f.key]: e.target.value } }, true)} />}
              {f.key === 'ziel' && <div className="grid gap-2"><p className="text-sm font-bold">Mögliche Formulierungen – nur übernehmen, wenn sie zu deinem Wunsch passen</p><div className="flex flex-wrap gap-2">{wishes.map((wish) => <button key={wish} type="button" className="pill !shadow-none" onClick={() => {
                const current = d.answers.ziel?.trim() || '';
                const nextValue = current.toLocaleLowerCase('de-DE').includes(wish.toLocaleLowerCase('de-DE')) ? current : [current, wish].filter(Boolean).join('\n');
                change({ answers: { ...d.answers, ziel: nextValue } }, true);
              }}>+ {wish}</button>)}</div></div>}
            </div>;
          })}
          {d.intent?.confirmedDetails.length ? <label className="card grid gap-2"><span className="font-bold">Bereits genannte Details</span><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Bearbeite oder ergänze die Angaben; sie stammen aus deinem Text.</p><textarea aria-label="Bestätigte Details" rows={Math.min(5, Math.max(2, (d.answers.details || d.intent.confirmedDetails.join('\n')).split('\n').length))} maxLength={1500} value={d.answers.details ?? d.intent.confirmedDetails.join('\n')} onChange={(e) => change({ answers: { ...d.answers, details: e.target.value } }, true)} /></label> : null}
          {!state.profile.location && <p role="alert">Ergänze zuerst deinen Ort <Link href="/ich" className="underline">im Profil</Link>.</p>}
          {openQuestions.length > 0 && <p role="status" className="text-sm">Für die Recherche fehlt noch: {openQuestions.map((item) => item.question).join(' ')}</p>}
          <button className="btn-primary gap-2" disabled={Boolean(busy) || !state.profile.location || deliveryLocked || !d.intent || openQuestions.length > 0} onClick={() => research()}><Sparkles size={18} aria-hidden />Zuständigkeit und Möglichkeiten prüfen</button>
        </>}
        {step === 'moeglichkeiten' && <>
          {busy ? <AgentProgress events={events} /> : d.analysis ? <><AgentResult result={d.analysis} /><button className="btn-primary" onClick={() => go('entwurf')}>Zum Nachrichtentwurf</button><button className="btn-secondary" disabled={deliveryLocked} onClick={() => research(true)}>Recherche aktualisieren</button></> : <div className="card grid gap-3"><p>Kim recherchiert zuständige Stellen, mögliche Schritte und belegte Rechtsgrundlagen für dein Anliegen.</p><button className="btn-primary" disabled={deliveryLocked || !state.profile.location} onClick={() => research()}>Recherche starten / erneut versuchen</button></div>}
        </>}
        {step === 'entwurf' && <>
          {!d.segments.length ? <button className="btn-primary" disabled={Boolean(busy) || deliveryLocked} onClick={() => research()}>Entwurf recherchieren</button> : <>
            <div className="flex gap-2 flex-wrap"><span className="chip">Schwarz: deine Worte</span><span className="chip ai-rephrase">Grau: von Kim</span><span className="chip chip-bund" data-testid="ai-share">KI-Anteil {aiShare} %</span></div>
            {mailFields()}
            {editing ? <textarea aria-label="Entwurf bearbeiten" rows={14} maxLength={24000} className="card w-full" value={body} onChange={(e) => change({ segments: mergeEdit(d.segments, e.target.value) })} /> : <div className="card whitespace-pre-wrap break-words"><OwnershipText segments={d.segments} /></div>}
            <div className="grid grid-cols-2 gap-2"><button className="btn-secondary gap-2" onClick={() => setEditing(!editing)}><PenLine size={18} aria-hidden />{editing ? 'Fertig' : 'Bearbeiten'}</button><button className="btn-secondary gap-2" disabled={Boolean(busy) || deliveryLocked} onClick={() => research(true)}><Sparkles size={18} aria-hidden />Neu recherchieren</button></div>
            <button className="btn-primary" disabled={deliveryLocked} onClick={() => { setEditing(false); next(); }}>Weiter zum Prüfen</button>
          </>}
        </>}
        {step === 'pruefen' && <>
          <p className="text-xl font-extrabold">Ist alles richtig?</p>
          {d.analysis && <details className="card"><summary className="font-bold cursor-pointer">Zuständigkeit, Rechtsgrundlagen und Guardian</summary><div className="grid gap-3 mt-3"><AgentResult result={d.analysis} /></div></details>}
          {d.analysis && !d.analysis.guardian.pass && <p role="alert" className="card">Der Guardian hat noch offene Punkte. Überarbeite den Entwurf anhand der Hinweise; der bearbeitete Text wird erneut geprüft.</p>}
          <DraftFactCheck text={d.ownText} />
          {canEmail ? <>
            {mailFields()}
            <GmailConnection beforeConnect={beforeGmail} onStatus={setGmail} />
            <button className="btn-primary" disabled={Boolean(busy) || !gmail?.authorized || !body || !d.recipientEmail || !d.recipientSourceUrl || deliveryLocked} onClick={prepare}>Kontakt prüfen und Vorschau öffnen</button>
          </> : <div className="card grid gap-3"><p>{forms.length ? 'Für dieses Anliegen ist ein Onlineformular belegt. Prüfe den Text und reiche ihn dort selbst ein.' : 'Noch kein sicherer Versandweg belegt. Recherchiere erneut oder kläre die Zuständigkeit anhand der Quellen.'}</p>
            {forms.map((c) => <a key={c.value} href={c.value} target="_blank" rel="noreferrer" className="btn-primary">Offizielles Formular öffnen ↗</a>)}
            <button className="btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(d.subject + '\n\n' + body); toast('Text kopiert'); } catch { setEditing(true); setStep('entwurf'); } }}>Nachricht kopieren</button>
            <button className="btn-secondary" disabled={Boolean(busy) || deliveryLocked} onClick={() => research(true)}>Recherche erneut starten</button>
          </div>}
        </>}
        {step === 'senden' && <>
          <p className="text-xl font-extrabold">So geht es raus</p>
          <div className="card grid gap-3" data-testid="mail-preview">
            <p className="text-sm"><strong>Von:</strong> {review?.payload.sender || gmail?.email || 'Dein verbundenes Gmail-Konto'}</p>
            {mailFields()}
            <label className="grid gap-1"><span className="text-sm font-bold">Vollständiger Nachrichtentext</span><textarea rows={14} maxLength={24000} disabled={deliveryLocked || Boolean(busy)} className="search-input !pl-4 !rounded-xl" value={body} onChange={(e) => change({ segments: mergeEdit(d.segments, e.target.value) })} /></label>
          </div>
          {!review ? <button className="btn-primary" disabled={Boolean(busy) || !canEmail || deliveryLocked || tour} onClick={prepare}>Nachricht erneut prüfen</button> : <>
            <label className="card flex items-start gap-3"><input type="checkbox" className="mt-1 w-5 h-5" checked={checked} onChange={(e) => setChecked(e.target.checked)} /><span>Ich habe Empfänger, Kontaktquelle, Betreff und vollständigen Text geprüft und möchte diese E-Mail jetzt senden.</span></label>
            <div className="relative"><SwipeSlider label="Wischen zum Senden →" onConfirm={send} disabled={!checked || Boolean(busy) || tour || deliveryLocked} />{sent && <Confetti />}</div>
          </>}
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>Direkt an den angezeigten Empfänger. Nur du bestätigst den Versand.</p>
        </>}
        {step === 'fertig' && <div className="grid gap-4 justify-items-center text-center pt-8"><KimBase pose="done" size={130} /><h2 className="text-3xl">Gesendet</h2><p>An {sent?.recipient}. Du findest die Nachricht im Gmail-Ordner „Gesendet“.</p><Link href="/wirkung" className="btn-primary gap-2"><Mail size={18} aria-hidden />Zu meinen Schreiben</Link></div>}
      </motion.div>
    </AnimatePresence>
  </div>;
}
function ProcedureCard({ p, selected, suggested, onSelect }: { p: Procedure; selected: boolean; suggested?: string; onSelect: () => void }) {
  return <button aria-pressed={selected} onClick={onSelect} className="card text-left grid gap-1" style={selected ? { boxShadow: '0 0 0 2px var(--primary)', background: 'var(--primary-light)' } : undefined}>
    <span className="flex items-center gap-2 flex-wrap"><strong className="text-lg">{p.title}</strong>{suggested && <span className="chip" style={{ background: 'var(--honey-bg)', color: 'var(--honey-text)' }}>Kims Vorschlag</span>}</span>
    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.explain}</span><span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{p.short}{suggested ? ' · ' + suggested : ''}</span>
  </button>;
}
function ErrorBox({ text }: { text: string }) { return <div role="alert" className="card" style={{ background: 'var(--contra-bg)' }}><p className="font-semibold" style={{ color: 'var(--contra-text)' }}>{text}</p></div>; }
export { PROCEDURES };

