import type { z } from 'zod';

/**
 * One agent = one file. `input` validates the request, `run` returns the JSON answer.
 * An agent throws HttpError for expected failures and Blocked (via mustPass) when the Guardian rejects its output.
 */
export interface Agent<I = unknown, O = unknown> {
  name: string;
  input: z.ZodType<I>;
  /** false = offers a deterministic fallback when local Ollama is disabled. Legacy property name. */
  needsKey: boolean;
  run(input: I): Promise<O>;
}

export const defineAgent = <I, O>(agent: Agent<I, O>) => agent;
