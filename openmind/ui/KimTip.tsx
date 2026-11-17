'use client';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import KimBase from '@/components/Kim';
import { useAppState } from '@/lib/store';
import { useTour } from '@/features/tour/store';

/** How long a hint stays before it goes away by itself. */
const SHOW_MS = 8000;

/**
 * A one-time hint from Kim on the first visit of a screen: a small bubble just above the tab bar,
 * so it never covers the heading or shifts the page. It leaves by itself after a few seconds or on a tap,
 * and stays away for this account.
 * `bottom` lifts it above other fixed elements at the bottom (e.g. the chat input).
 */
export function KimTip({ id, children, bottom = 92 }: { id: string; children: string; bottom?: number }) {
  const { state, update, ready } = useAppState();
  const { active: touring } = useTour();
  // During the guided tour Kim speaks from the tour bubble; one-time tips would only get in the way.
  const open = ready && !touring && !state.tips.includes(id);
  const dismiss = () => update((s) => (s.tips.includes(id) ? s : { ...s, tips: [...s.tips, id] }));

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="note"
          className="fixed left-1/2 z-[150] w-auto max-w-[min(406px,calc(100%-24px))]"
          style={{ bottom: `calc(${bottom}px + env(safe-area-inset-bottom))`, x: '-50%' }}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.6, type: 'spring', stiffness: 220, damping: 24 } }}
          exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.2 } }}
        >
          <button
            className="flex items-center gap-2 rounded-full pl-1.5 pr-2 py-1.5 text-left"
            style={{ background: 'var(--card)', boxShadow: 'var(--shadow-lift)' }}
            onClick={dismiss}
            aria-label="Hinweis von Kim schließen"
          >
            {!state.profile.kimDisabled && <span className="shrink-0"><KimBase pose="listen" size={30} /></span>}
            <span className="text-sm font-semibold leading-snug">{children}</span>
            <X size={16} aria-hidden className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
