import { NextResponse } from 'next/server';
import { getAgent } from '@/agents/registry';
import { hasKey, model } from '@/core/ai/client';
import { sameOrigin } from '@/core/http/origin';
import { requireUser } from '@/core/auth';
import { rateLimit } from '@/core/http/rateLimit';
import { HttpError, safeRoute } from '@/core/http/safeRoute';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ name: string }> }) => {
  const agent = getAgent((await params).name);
  if (!agent) throw new HttpError(404, 'Diesen Agenten gibt es nicht.');
  sameOrigin(req);
  const user = await requireUser(req);
  rateLimit(`ai:${user.id}`, 40, 10 * 60_000);
  const input = agent.input.parse(await req.json());
  if (agent.needsKey && !hasKey()) throw new HttpError(503, 'Die lokale KI ist deaktiviert. Aktiviere Ollama auf dem Server.');
  const result = await agent.run(input);
  const extra = result && typeof result === 'object' ? result : {};
  return NextResponse.json({ ...extra, model: 'model' in extra && typeof extra.model === 'string' ? extra.model : model(), provider: 'ollama' });
});
