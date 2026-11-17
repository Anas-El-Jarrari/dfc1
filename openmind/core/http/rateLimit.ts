import { HttpError } from './safeRoute';

const hits = new Map<string, number[]>();

/**
 * Sliding-window limit per key (e.g. user id + route). In memory: fine for one server process;
 * a shared store (Redis, database) is needed once the app runs on several instances.
 */
export function rateLimit(key: string, max: number, windowMs: number, message = 'Kurz durchatmen: zu viele Anfragen. Versuch es in ein paar Minuten noch einmal.') {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new HttpError(429, message);
  recent.push(now);
  hits.set(key, recent);
}
