import type { Segment } from '@/lib/diff';

/** Own words black, AI words grey with a dotted underline. */
export default function OwnershipText({ segments }: { segments: Segment[] }) {
  return (
    <p className="leading-relaxed" data-testid="ownership-text">
      {segments.map((s, i) =>
        s.ai ? <span key={i} className="ai-rephrase" data-ai="true">{s.text}</span> : <span key={i} style={{ color: 'var(--text)' }}>{s.text}</span>,
      )}
    </p>
  );
}
