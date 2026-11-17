import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/core/auth';
import { safeRoute } from '@/core/http/safeRoute';
import { sameOrigin } from '@/core/http/origin';
import { rateLimit } from '@/core/http/rateLimit';
import { prepareReview } from '@/core/gmail/service';
export const POST = safeRoute(async (req: Request) => {
  sameOrigin(req);
  const user = await requireUser(req);
  rateLimit('review:' + user.id, 10, 60_000);
  const { draftId } = z.object({ draftId: z.string() }).parse(await req.json());
  return NextResponse.json(await prepareReview(user.id, draftId));
});

