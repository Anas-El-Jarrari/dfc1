export const MIN_RESPONSES = 20;

/** Below the threshold, no distribution is revealed – single answers could be traced back and early numbers mislead. */
export function surveyResults(counts: number[]) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total < MIN_RESPONSES) return { visible: false as const, total, missing: MIN_RESPONSES - total };
  return { visible: true as const, total, percents: counts.map((c) => Math.round((c / total) * 100)) };
}

/** Spread the stored response count across options using the seed distribution. */
export function distribute(total: number, seed: number[]) {
  const s = seed.reduce((a, b) => a + b, 0);
  const out = seed.map((x) => Math.floor((x / s) * total));
  out[0] += total - out.reduce((a, b) => a + b, 0);
  return out;
}
