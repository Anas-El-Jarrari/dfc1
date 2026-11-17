import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { hasKey, provider } from '@/core/ai/client';
import { callJSON, callStructured } from '@/core/ai/json';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Lokales Ollama', () => {
  it('verwendet Ollama unabhängig von alten Cloud-Keys', () => {
    vi.stubEnv('GEMINI_API_KEY', 'obsolete-placeholder');
    vi.stubEnv('ANTHROPIC_API_KEY', 'obsolete-placeholder');
    vi.stubEnv('OLLAMA_ENABLED', 'true');
    expect(provider()).toBe('ollama'); expect(hasKey()).toBe(true);
  });
  it('sendet JSON-Schema und keine Zugangsdaten an die lokale API; zeigt das tatsächliche Modell', async () => {
    const mock = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ model: 'qwen3:8b-actual', message: { content: '{"ok":true}' } }));
    vi.stubGlobal('fetch', mock);
    const r = await callStructured({ system: 'system', user: 'Anliegen', schema: z.object({ ok: z.boolean() }) });
    expect(r).toEqual({ value: { ok: true }, model: 'qwen3:8b-actual' });
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    expect(JSON.parse(String(init.body))).toMatchObject({ think: false, stream: false, format: { type: 'object' } });
    expect(JSON.stringify(init.headers)).not.toMatch(/key|bearer/i);
  });
  it('wiederholt eine ungültige Modellstruktur genau einmal', async () => {
    const mock = vi.fn().mockResolvedValueOnce(Response.json({ message: { content: '{"items": "kein array"}' } })).mockResolvedValueOnce(Response.json({ message: { content: '{"items":[]}' } }));
    vi.stubGlobal('fetch', mock);
    expect(await callJSON({ system: 's', user: 'u', schema: z.object({ items: z.array(z.string()) }) })).toEqual({ items: [] });
    expect(mock).toHaveBeenCalledTimes(2);
  });
  it('bricht nach zwei kaputten JSON-Antworten verständlich ab', async () => {
    const mock = vi.fn(async () => Response.json({ message: { content: '{"invalid": [' } }));
    vi.stubGlobal('fetch', mock);
    await expect(callJSON({ system: 's', schema: z.object({ ok: z.boolean() }) })).rejects.toThrow('strukturierte Antwort');
    expect(mock).toHaveBeenCalledTimes(2);
  });
  it('wechselt bei Nichterreichbarkeit niemals zu einem Cloudanbieter', async () => {
    const mock = vi.fn(async () => { throw new Error('offline'); }); vi.stubGlobal('fetch', mock);
    await expect(callJSON({ system: 's', schema: z.object({}) })).rejects.toThrow('Ollama antwortet nicht');
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

