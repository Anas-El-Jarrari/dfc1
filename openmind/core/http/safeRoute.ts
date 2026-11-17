import { unstable_rethrow } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BLOCKED_MESSAGE, Blocked } from '@/core/guardian';
import { OllamaError } from '@/core/ai/client';

/** An expected failure with a message that is safe to show to the user. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function friendly(e: unknown): { status: number; error: string } {
  if (e instanceof HttpError) return { status: e.status, error: e.message };
  if (e instanceof OllamaError) return { status: 503, error: e.message };
  if (e instanceof ZodError || e instanceof SyntaxError) return { status: 400, error: 'Die Eingabe ist unvollständig oder ungültig.' };
  const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 0;
  if (status === 401 || status === 403) return { status: 503, error: 'Der Dienst hat die Anfrage abgelehnt. Prüfe die Verbindung.' };
  if (status === 404) return { status: 503, error: 'Das lokale Modell wurde nicht gefunden. Prüfe OLLAMA_MODEL.' };
  if (status === 429 || status === 529) return { status: 503, error: 'Kim ist gerade überlastet. Versuch es gleich noch einmal.' };
  return { status: 500, error: 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.' };
}

/** Wraps a route handler: every failure becomes a JSON answer with a friendly German message. */
export function safeRoute<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (e) {
      // Next.js steers rendering with its own internal errors (e.g. "this route is dynamic"); they must pass through.
      unstable_rethrow(e);
      if (e instanceof Blocked) return NextResponse.json({ blocked: true, message: BLOCKED_MESSAGE, guardian: e.check });
      const { status, error } = friendly(e);
      if (status === 500) console.error('[OpenMind]', e);
      return NextResponse.json({ error }, { status });
    }
  };
}
