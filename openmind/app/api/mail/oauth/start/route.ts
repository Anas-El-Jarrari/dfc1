import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
import { startOAuth } from '@/core/gmail/oauth';
export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  const { returnPath } = z.object({ returnPath: z.string().max(500).default('/ich') }).parse(await req.json());
  return NextResponse.json({ url: await startOAuth(req, user.id, returnPath) });
});

