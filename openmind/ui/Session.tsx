'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { forgetAccount, openAccount, type ServerAccount } from '@/lib/store';

export interface MailSettings { ownEmail: string | null }
type Status = 'loading' | 'in' | 'out';

interface Session {
  status: Status;
  user?: ServerAccount['user'];
  settings: MailSettings;
  saveSettings: (patch: Partial<MailSettings>) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const NO_SETTINGS: MailSettings = { ownEmail: null };
const SessionContext = createContext<Session>({ status: 'loading', settings: NO_SETTINGS, saveSettings: async () => false, logout: async () => {}, deleteAccount: async () => {} });
export const useSession = () => useContext(SessionContext);

const PUBLIC = ['/', '/anmelden', '/datenschutz', '/status', '/ui'];
const ACCOUNTS = 'openmind-accounts';

/** E-mail addresses that signed in on this device before, newest first. Only the address is kept. */
export function knownAccounts(): string[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS) ?? '[]'); } catch { return []; }
}
function remember(email: string) {
  try { localStorage.setItem(ACCOUNTS, JSON.stringify([email, ...knownAccounts().filter((e) => e !== email)].slice(0, 5))); } catch {}
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<ServerAccount['user']>();
  const [settings, setSettings] = useState<MailSettings>(NO_SETTINGS);

  useEffect(() => {
    fetch('/api/me')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((me) => (me?.user ? me : null))
      .catch(() => null)
      .then((me: (ServerAccount & { settings: MailSettings }) | null) => {
        openAccount(me);
        if (me) {
          remember(me.user.email);
          setUser(me.user);
          setSettings(me.settings ?? NO_SETTINGS);
        }
        setStatus(me ? 'in' : 'out');
        // The proxy only checks that a cookie exists; an expired session ends up here.
        if (!me && !PUBLIC.includes(window.location.pathname)) window.location.replace('/anmelden');
      });
  }, []);

  const saveSettings = useCallback(async (patch: Partial<MailSettings>) => {
    const r = await fetch('/api/me', { method: 'PATCH', body: JSON.stringify({ settings: patch }) }).catch(() => undefined);
    if (!r?.ok) return false;
    setSettings((await r.json()).settings);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    // A full page load guarantees that nothing of the previous account stays in memory.
    window.location.href = '/anmelden';
  }, []);

  const deleteAccount = useCallback(async () => {
    const r = await fetch('/api/me', { method: 'DELETE' }).catch(() => undefined);
    if (!r?.ok) return;
    forgetAccount();
    window.location.href = '/';
  }, []);

  return <SessionContext.Provider value={{ status, user, settings, saveSettings, logout, deleteAccount }}>{children}</SessionContext.Provider>;
}
