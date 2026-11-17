import type { KimPose } from '@/components/Kim';

/**
 * How a step finds the element it explains: a CSS selector, optionally narrowed to the
 * first visible match containing `text`, optionally widened to the closest `closest` ancestor.
 */
export interface Target { sel: string; text?: string; closest?: string }

export interface TourStep {
  chapter: string;
  /** Page (path plus query) the step lives on; the tour navigates there. */
  path: string;
  /** Without a target the step is a centred message. */
  target?: Target;
  title: string;
  text: string;
  pose?: KimPose;
  /** Inside the write flow: which of its steps to show. */
  write?: 'anliegen' | 'erst-du' | 'verfahren' | 'fragen' | 'entwurf' | 'pruefen' | 'senden';
}

const btn = (text: string, sel = 'a,button'): Target => ({ sel, text });
const card = (heading: string): Target => ({ sel: 'h2', text: heading, closest: '.card' });

const tab = (href: string): Target => ({ sel: `nav[aria-label="Hauptnavigation"] a[href="${href}"]` });

/**
 * An overview, tab by tab: each chapter first shows the tab, then the two or three main areas
 * of that page from top to bottom. No detours into sub-flows.
 */
export const TOUR: TourStep[] = [
  { chapter: 'Willkommen', path: '/entdecken', title: 'Ein kurzer Rundgang', text: 'Ich zeige dir die vier Bereiche der App. Mit „Weiter“ geht es voran, mit ✕ hörst du auf.', pose: 'listen' },

  { chapter: 'Heute', path: '/entdecken', target: tab('/entdecken'), title: 'Heute', text: 'Deine Startseite: was in deiner Stadt und darüber hinaus passiert.' },
  { chapter: 'Heute', path: '/entdecken', target: { sel: '[role="tablist"][aria-label="Heute"]' }, title: 'Zwei Ansichten', text: 'Neuigkeiten sind echte Nachrichten. „Zum Mitreden“ sind Themen, bei denen du gerade mitreden kannst.' },
  { chapter: 'Heute', path: '/entdecken', target: { sel: '[data-testid="news-card"]' }, title: 'Eine Meldung', text: 'Immer aus einer geprüften Quelle, mit Siegel. „Warum?“ zeigt, warum du sie siehst. Nach rechts wischen merkt sie dir.', pose: 'search' },
  { chapter: 'Heute', path: '/entdecken?tab=themen', target: { sel: '[data-testid="topic-card"]' }, title: 'Zum Mitreden', text: 'Ein Thema mit Frist und beiden Seiten. Erst hältst du deine Sicht fest, dann zeige ich Argumente.' },

  { chapter: 'Mitmachen', path: '/mitmachen', target: tab('/mitmachen'), title: 'Mitmachen', text: 'Hier wirst du aktiv.' },
  { chapter: 'Mitmachen', path: '/mitmachen', target: { sel: '[data-tour="start"]' }, title: 'Selbst starten', text: 'Antrag, Petition oder Umfrage. Du schreibst zuerst in deinen Worten, ich helfe danach. Senden kannst nur du, mit einem Wisch.', pose: 'wait' },
  { chapter: 'Mitmachen', path: '/mitmachen', target: { sel: 'section[aria-label="Mitmachen in echt"]' }, title: 'Jetzt mitmachen', text: 'Echte Petitionen, Ehrenamt und Wege zu Stadt und Rat, passend zu dir.' },

  { chapter: 'Kim', path: '/frag-nach', target: tab('/frag-nach'), title: 'Kim', text: 'Das bin ich. Hier kannst du mich alles fragen.' },
  { chapter: 'Kim', path: '/frag-nach', target: { sel: '[data-tour="kim-actions"]' }, title: 'Schnelle Wege', text: 'Etwas verändern, ein Thema verstehen oder prüfen, ob etwas stimmt.', pose: 'search' },
  { chapter: 'Kim', path: '/frag-nach', target: { sel: 'input[aria-label="Nachricht an Kim"]' }, title: 'Frag mich', text: 'Ich antworte nur mit Belegen. Eine Empfehlung bekommst du nie, beide Seiten immer.' },

  { chapter: 'Ich', path: '/ich', target: tab('/ich'), title: 'Ich', text: 'Dein Konto und deine Einstellungen.' },
  { chapter: 'Ich', path: '/ich', target: btn('Meine Wirkung', 'a'), title: 'Meine Wirkung', text: 'Alles, was du gesendet hast, und Entwürfe zum Weiterschreiben.' },
  { chapter: 'Ich', path: '/ich', target: card('E-Mail'), title: 'Einstellungen', text: 'Darunter: deine E-Mail, was dir wichtig ist, Barrierefreiheit und deine Daten.' },

  { chapter: 'Fertig', path: '/ich', target: btn('Tutorial wiederholen', 'a'), title: 'Das war’s', text: 'Ich helfe, du entscheidest. Hier startest du den Rundgang jederzeit neu.', pose: 'done' },
];
