import { NextResponse } from 'next/server';
import { requireUser } from '@/core/auth';
import { finishOAuth } from '@/core/gmail/oauth';
import { gmailConfig } from '@/core/gmail/client';
import { HttpError } from '@/core/http/safeRoute';
export async function GET(req: Request) {
  try { return NextResponse.redirect(await finishOAuth(req, (await requireUser(req)).id)); }
  catch (error) {
    const url = new URL('/ich', gmailConfig().appUrl);
    url.searchParams.set('gmailError', error instanceof HttpError ? error.message : 'Die Gmail-Verbindung ist fehlgeschlagen. Bitte erneut versuchen.');
    return NextResponse.redirect(url);
  }
}

