/** Local Ollama adapter ported from DFC. Cloud API keys are never used. */
export const model = () => process.env.OLLAMA_MODEL || 'qwen3:8b';
export const baseUrl = () => (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
export const provider = () => 'ollama' as const;
export const hasKey = () => process.env.OLLAMA_ENABLED !== 'false';
export class OllamaError extends Error { status = 503; }
export async function ollamaChat(system: string, messages: { role: 'user' | 'assistant'; content: string }[], maxTokens = 1800, format: unknown = 'json', signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(baseUrl() + '/api/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store',
      signal: AbortSignal.any([AbortSignal.timeout(180_000), ...(signal ? [signal] : [])]),
      body: JSON.stringify({ model: model(), messages: [{ role: 'system', content: system }, ...messages], stream: false, think: false, format, options: { temperature: 0.2, num_predict: maxTokens } }),
    });
  } catch {
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    throw new OllamaError('Ollama antwortet nicht. Starte Ollama und prüfe die lokale Modellverbindung.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new OllamaError(response.status === 404 ? 'Das lokale Modell fehlt. Installiere es mit ollama pull ' + model() + '.' : 'Das lokale Modell konnte die Anfrage nicht bearbeiten.');
  if (!data.message?.content?.trim()) throw new OllamaError('Ollama hat keine Antwort geliefert.');
  return { text: String(data.message.content), model: String(data.model || model()) };
}
export async function ollamaStatus() {
  try {
    const response = await fetch(baseUrl() + '/api/tags', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await response.json();
    const available = response.ok && (data.models || []).some((entry: { name: string }) => entry.name.replace(/:latest$/, '') === model().replace(/:latest$/, ''));
    return { ok: Boolean(available), model: model(), detail: available ? 'Ollama · ' + model() : 'Modell ' + model() + ' ist nicht installiert.' };
  } catch { return { ok: false, model: model(), detail: 'Ollama ist nicht erreichbar.' }; }
}

