import { NextResponse } from 'next/server';
import { requireUser } from '@/core/auth';
import { safeRoute } from '@/core/http/safeRoute';
import { gmailStatus } from '@/core/gmail/client';
export const GET = safeRoute(async (req: Request) => NextResponse.json(await gmailStatus((await requireUser(req)).id)));

