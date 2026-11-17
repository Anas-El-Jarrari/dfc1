'use client';
import { useRef, useState } from 'react';

/** The only way to submit anything. Drag to the end, or focus and press Enter/→ on the keyboard. */
export default function SwipeSlider({ label = 'Ja, so einreichen →', onConfirm, disabled }: { label?: string; onConfirm: () => void | boolean | Promise<void | boolean>; disabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const start = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const confirming = useRef(false);

  const max = () => (track.current ? track.current.clientWidth - 56 : 200);
  const finish = async () => {
    if (done || disabled || confirming.current) return;
    confirming.current = true;
    setDone(true);
    setX(max());
    // A short buzz confirms the decision on phones; silently ignored elsewhere.
    try { navigator.vibrate?.(30); } catch {}
    // onConfirm may report failure (e.g. mail not sent); then the knob springs back and the person can retry.
    let result: void | boolean;
    try { result = await onConfirm(); } catch { result = false; }
    if (result === false) {
      setDone(false);
      setX(0);
    }
    confirming.current = false;
  };

  return (
    <div
      ref={track}
      className="swipe-slider"
      style={{ opacity: disabled ? 0.5 : 1 }}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((x / max()) * 100) || 0}
      aria-disabled={disabled}
      data-testid="swipe-slider"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'End') {
          e.preventDefault();
          finish();
        }
      }}
    >
      <div aria-hidden className="swipe-fill" style={{ width: x + 52, transition: dragging ? 'none' : undefined }} />
      <span className="swipe-label">{done ? 'Eingereicht ✓' : label}</span>
      <div
        className="swipe-track"
        style={{ left: 4 + x, transition: dragging ? 'none' : undefined, scale: dragging ? 1.08 : 1 }}
        onPointerDown={(e) => {
          if (disabled || done) return;
          start.current = e.clientX - x;
          setDragging(true);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current === null) return;
          setX(Math.max(0, Math.min(max(), e.clientX - start.current)));
        }}
        onPointerUp={() => {
          start.current = null;
          setDragging(false);
          if (x > max() * 0.9) finish();
          else if (!done) setX(0);
        }}
      >
        {done ? '✓' : '→'}
      </div>
    </div>
  );
}
