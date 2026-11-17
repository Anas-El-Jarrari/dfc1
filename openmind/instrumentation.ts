export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') console.info('[OpenMind] Lokale KI: Ollama · ' + (process.env.OLLAMA_MODEL || 'qwen3:8b') + '. Gmail-Versand nur nach persönlicher Freigabe.');
}

