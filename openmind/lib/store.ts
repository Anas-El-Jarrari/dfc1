'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Submission, UserProfile } from './types';

export interface AppState {
  onboarded: boolean;
  profile: UserProfile & { values: string[]; consentProfile: boolean };
  tendencies: Record<string, { tendency: string; values: string[]; at: string }>;
  submissions: Submission[];
  supported: string[];
  surveyAnswers: Record<string, number>;
  chatLog: string[];
  name: string;
  tutorialDone: boolean;
  /** Ids of the one-time hints from Kim that were already dismissed. */
  tips: string[];
}

export const DEFAULT_STATE: AppState = {
  onboarded: false,
  profile: {
    location: 'Düsseldorf-Bilk',
    interests: ['Verkehr', 'Kinder', 'Klima'],
    easyLanguage: false,
    kimDisabled: false,
    values: ['Sicherheit', 'Klima', 'Familie'],
    consentProfile: true,
  },
  tendencies: {},
  submissions: [
    { id: 's1', topicId: 'radwege-bilk', topicTitle: 'Sicherer Übergang Bilker Allee', type: 'antrag', level: 'stadt', text: '', submittedAt: '2026-10-02', status: 'im_ausschuss', referenceNumber: 'A-2026-0412', nextDate: 'Ausschuss für Mobilität, 03.12.' },
  ],
  supported: [],
  surveyAnswers: { 'eigene-spielplatz': 14 },
  chatLog: [],
  name: '',
  tutorialDone: false,
  tips: [],
};

const KEY = 'openmind-state-v1';
const listeners = new Set<() => void>();

/**
 * State is cached in localStorage per account, so two people on one device never see each other's data.
 * `account` is undefined until the session is known, null when signed out.
 */
let account: string | null | undefined;
const key = () => (account ? `${KEY}:${account}` : KEY);

export function readState(): AppState {
  try {
    const raw = localStorage.getItem(key());
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

/** The part of the state that lives in the account on the server. */
const serverPart = (s: AppState) => ({
  name: s.name || null,
  profile: {
    district: s.profile.location,
    interests: s.profile.interests,
    values: s.profile.values,
    easyLanguage: s.profile.easyLanguage,
    kimDisabled: s.profile.kimDisabled,
    consentProfile: s.profile.consentProfile,
    onboarded: s.onboarded,
    tutorialDone: s.tutorialDone,
  },
});

let pushed = '';
let pending: string | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let syncing: Promise<void> = Promise.resolve();

/** Sends the waiting change now. keepalive lets the request finish even while the page is closing. */
function flush() {
  clearTimeout(timer);
  if (!pending) return syncing;
  const body = pending;
  pending = undefined;
  syncing = syncing.catch(() => {}).then(async () => {
    let response: Response;
    try { response = await fetch('/api/me', { method: 'PATCH', body, keepalive: true }); }
    catch { pending ??= body; throw new Error('Dein Profil konnte nicht gespeichert werden. Bitte Verbindung prüfen.'); }
    if (!response.ok) { pending ??= body; throw new Error('Dein Profil konnte nicht gespeichert werden. Bitte erneut versuchen.'); }
    pushed = body;
  });
  return syncing;
}
/** Agent runs wait for profile changes, so the server always researches the current location. */
export const flushProfile = () => flush();
// Without this, a change made in the last moment before leaving or reloading would be lost.
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { void flush().catch(() => {}); });

function push(s: AppState) {
  if (!account) return;
  const body = JSON.stringify(serverPart(s));
  if (body === pushed) return;
  pending = body;
  clearTimeout(timer);
  timer = setTimeout(() => { void flush().catch(() => {}); }, 400);
}

export function writeState(s: AppState) {
  try {
    localStorage.setItem(key(), JSON.stringify(s));
  } catch {}
  push(s);
  listeners.forEach((l) => l());
}

export interface ServerAccount {
  user: { id: string; email: string; name: string | null };
  profile: { district: string | null; interests: string[]; values: string[]; easyLanguage: boolean; kimDisabled: boolean; consentProfile: boolean; onboarded: boolean; tutorialDone: boolean };
}

/** Called once the session is known. Switches the cache to that account and merges the server profile in. */
export function openAccount(server: ServerAccount | null) {
  account = server ? server.user.id : null;
  if (server) {
    try {
      // First sign-in on a device that was used before accounts existed: adopt that data once.
      const legacy = localStorage.getItem(KEY);
      if (legacy && !localStorage.getItem(key())) localStorage.setItem(key(), legacy);
      localStorage.removeItem(KEY);
    } catch {}
    const local = readState();
    const p = server.profile;
    // An onboarded account is the source of truth; otherwise local choices are kept and pushed up.
    const merged: AppState = p.onboarded
      ? {
          ...local,
          onboarded: true,
          tutorialDone: p.tutorialDone,
          name: server.user.name ?? '',
          profile: { ...local.profile, location: p.district ?? '', interests: p.interests, values: p.values, easyLanguage: p.easyLanguage, kimDisabled: p.kimDisabled, consentProfile: p.consentProfile },
        }
      : local;
    if (p.onboarded) pushed = JSON.stringify(serverPart(merged));
    writeState(merged);
  } else {
    listeners.forEach((l) => l());
  }
}

export function forgetAccount() {
  try { localStorage.removeItem(key()); } catch {}
}

export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setState(readState());
      setReady(account !== undefined);
    };
    sync();
    listeners.add(sync);
    return () => void listeners.delete(sync);
  }, []);
  const update = useCallback((fn: (s: AppState) => AppState) => writeState(fn(readState())), []);
  return { state, update, ready };
}

export function newRef(prefix: string) {
  return `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
}
