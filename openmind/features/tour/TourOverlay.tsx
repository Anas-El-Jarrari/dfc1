'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import KimBase from '@/components/Kim';
import { useAppState } from '@/lib/store';
import { TOUR, type Target } from './steps';
import { TOUR_WRITE_EVENT, tour, useTour } from './store';

const PAD = 8;
const WAIT_MS = 7000;
/** "Einen Moment …" only shows if finding the element takes noticeably long. */
const PATIENCE_MS = 700;
const DIM = 'rgba(43, 33, 28, 0.58)';
/** One calm spring for everything that moves, so spotlight and bubble glide together. */
const GLIDE = { type: 'spring', stiffness: 90, damping: 19, mass: 1 } as const;
/** Gentle ease for fades. */
const SOFT = [0.4, 0, 0.2, 1] as const;

type Rect = { top: number; left: number; width: number; height: number };

function find(t: Target): HTMLElement | undefined {
  const all = Array.from(document.querySelectorAll<HTMLElement>(t.sel));
  // getClientRects also counts fixed elements (like the tab bar), which have no offsetParent.
  const hit = all.find((el) => el.getClientRects().length > 0 && (!t.text || (el.textContent ?? '').includes(t.text)));
  if (!hit) return undefined;
  return (t.closest ? hit.closest<HTMLElement>(t.closest) : null) ?? hit;
}

/** Same page: same path and the same query values the step asks for (and no `tab` the step does not want). */
function samePage(stepPath: string, pathname: string, search: URLSearchParams) {
  const want = new URL(stepPath, 'http://x');
  if (want.pathname !== pathname) return false;
  if ((search.get('tab') ?? '') !== (want.searchParams.get('tab') ?? '')) return false;
  return [...want.searchParams].every(([k, v]) => search.get(k) === v);
}

/**
 * The guided tour: dims the page, cuts a rounded spotlight around the element being explained,
 * and lets Kim explain it from a bubble at the bottom (or top, if the element sits low).
 * Spotlight and bubble stay mounted between steps and glide to their new place instead of blinking.
 */
export function TourOverlay() {
  const { active, index } = useTour();
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { update } = useAppState();
  const [rect, setRect] = useState<Rect>();
  const [searching, setSearching] = useState(false);
  const [vh, setVh] = useState(844);
  const [bubbleH, setBubbleH] = useState(200);
  const observer = useRef<ResizeObserver | null>(null);
  const dir = useRef(1);
  const step = active ? TOUR[index] : undefined;

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Track the bubble's height so its position can be animated as a number.
  const measure = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(() => setBubbleH(el.offsetHeight));
    observer.current.observe(el);
    setBubbleH(el.offsetHeight);
  }, []);

  const finish = useCallback(() => {
    tour.stop();
    setRect(undefined);
    update((s) => ({ ...s, tutorialDone: true }));
  }, [update]);

  const go = useCallback((to: number) => {
    if (to >= TOUR.length) return finish();
    if (to < 0) return;
    dir.current = to >= index ? 1 : -1;
    tour.go(to);
  }, [index, finish]);

  // Navigate to the step's page, tell the write flow which step to show, then wait for the element.
  useEffect(() => {
    if (!step) return;
    if (!samePage(step.path, pathname, search)) {
      // A new page: the spotlight waits where it is and glides over once the new element is there.
      router.push(step.path);
      return;
    }
    if (!step.target) { setRect(undefined); setSearching(false); return; }

    let el: HTMLElement | undefined;
    let raf = 0;
    let poll: ReturnType<typeof setInterval> | undefined;
    const started = Date.now();
    const patience = setTimeout(() => setSearching(true), PATIENCE_MS);
    const track = () => {
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        setRect((old) => (old && old.top === r.top && old.left === r.left && old.width === r.width && old.height === r.height ? old : { top: r.top, left: r.left, width: r.width, height: r.height }));
      }
      raf = requestAnimationFrame(track);
    };
    const attempt = () => {
      if (step.write) window.dispatchEvent(new CustomEvent(TOUR_WRITE_EVENT, { detail: step.write }));
      el = find(step.target!);
      if (el) {
        clearInterval(poll);
        clearTimeout(patience);
        setSearching(false);
        // Scroll only when the element is not comfortably in view; tall ones go to the top.
        const r = el.getBoundingClientRect();
        const h = window.innerHeight;
        const tall = r.height > h * 0.45;
        const inView = r.top >= 60 && r.bottom <= h - 60;
        if (!inView) el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' });
        track();
        return true;
      }
      if (Date.now() - started > WAIT_MS) {
        // The element is not there (e.g. no news yet): skip this step in the direction of travel.
        clearInterval(poll);
        clearTimeout(patience);
        setSearching(false);
        go(index + dir.current);
        return true;
      }
      return false;
    };
    // Try at once, so steps on the same page move without delay.
    if (!attempt()) poll = setInterval(attempt, 120);
    return () => { clearInterval(poll); clearTimeout(patience); cancelAnimationFrame(raf); };
  }, [step, pathname, search, router, go, index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, index, go, finish]);

  if (!step) return null;

  /** Buttons of a bubble that is already moving on must not act a second time. */
  const from = (own: number, action: () => void) => () => {
    if (tour.current().index === own && tour.current().active) action();
  };

  const hole = rect && step.target
    ? (() => {
        const top = Math.max(8, rect.top - PAD);
        // A spotlight never takes more than half the screen; the rest belongs to Kim.
        const height = Math.min(rect.height + PAD * 2, vh * 0.5);
        return { top, left: Math.max(0, rect.left - PAD), width: rect.width + PAD * 2, height };
      })()
    : undefined;
  const centred = !step.target;
  const atTop = hole ? hole.top + hole.height / 2 > vh * 0.55 : false;
  const side = centred ? 'centre' : atTop ? 'top' : 'bottom';
  const bubbleTop = side === 'centre' ? (vh - bubbleH) / 2 : side === 'top' ? 12 : vh - bubbleH - 16;
  const last = index === TOUR.length - 1;
  // Without a hole the spotlight shrinks to a point in the middle; its shadow keeps the page dimmed.
  const spot = hole
    ? { ...hole, opacity: 1, boxShadow: `0 0 0 3px var(--primary-bright), 0 0 0 9999px ${DIM}` }
    : { top: vh / 2, left: typeof window === 'undefined' ? 200 : window.innerWidth / 2, width: 0, height: 0, opacity: 1, boxShadow: `0 0 0 0px rgba(0,0,0,0), 0 0 0 9999px ${DIM}` };

  return (
    <div aria-live="polite">
      {/* Blocks every click on the page, so nothing happens by accident while Kim explains. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} />
      <motion.div
        aria-hidden
        className="pointer-events-none"
        style={{ position: 'fixed', zIndex: 401, borderRadius: 18 }}
        initial={{ ...spot, opacity: 0 }}
        animate={spot}
        transition={{ ...GLIDE, opacity: { duration: 0.4, ease: SOFT } }}
      />

      {/* Within one side the bubble glides; when it changes sides it fades over instead of crossing the screen. */}
      <AnimatePresence mode="wait">
      <motion.div
        key={side}
        ref={measure}
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial: ${step.title}`}
        className="fixed left-1/2 z-[402] w-[calc(100%-24px)] max-w-[406px]"
        style={{ x: '-50%' }}
        initial={{ top: bubbleTop + (side === 'top' ? -8 : 8), opacity: 0 }}
        animate={{ top: bubbleTop, opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.24, ease: SOFT } }}
        transition={{ ...GLIDE, opacity: { duration: 0.34, ease: SOFT } }}
      >
        <div className="rounded-[28px] p-4 grid gap-3" style={{ background: 'var(--card)', boxShadow: '0 20px 50px rgba(43,33,28,0.35)' }}>
          <div className="flex items-start gap-3">
            <motion.span className="shrink-0" animate={{ scale: centred ? 1.3 : 1 }} transition={GLIDE} style={{ originX: 0, originY: 0 }}>
              <KimBase pose={searching ? 'search' : step.pose ?? 'listen'} size={52} />
            </motion.span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={searching ? 'wait' : index}
                className="flex-1 min-w-0"
                initial={{ opacity: 0, x: 6 * dir.current }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 * dir.current }}
                transition={{ duration: 0.22, ease: SOFT }}
              >
                <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>{step.chapter}</p>
                <h2 className="text-lg leading-snug">{searching ? 'Einen Moment …' : step.title}</h2>
              </motion.div>
            </AnimatePresence>
            <button className="icon-btn !w-10 !h-10 !shadow-none" style={{ background: 'var(--muted)' }} aria-label="Tutorial beenden" onClick={from(index, finish)}><X size={18} aria-hidden /></button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {!searching && (
              <motion.p
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: SOFT }}
              >
                {step.text}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold flex-1" style={{ color: 'var(--text-secondary)' }}>{index + 1} / {TOUR.length}</span>
            {index > 0 && <button className="btn-secondary !w-auto !min-h-[44px] !py-2 !px-4" onClick={from(index, () => go(index - 1))}>Zurück</button>}
            <button className="btn-primary !w-auto !min-h-[44px] !py-2 !px-5" onClick={from(index, () => go(index + 1))} autoFocus>{last ? 'Fertig' : 'Weiter'}</button>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--track)' }} aria-hidden>
            <motion.div className="h-full" style={{ background: 'var(--primary)' }} animate={{ width: `${((index + 1) / TOUR.length) * 100}%` }} transition={GLIDE} />
          </div>
        </div>
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
