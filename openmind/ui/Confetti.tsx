'use client';
import { motion } from 'motion/react';

const COLORS = ['var(--honey)', 'var(--primary-bright)', 'var(--sage-bright)', 'var(--primary-light)'];
// Fixed spread, so server and client render the same pieces.
const PIECES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 70 + ((i * 37) % 60);
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 40, rotate: (i * 73) % 360, color: COLORS[i % COLORS.length], round: i % 3 === 0 };
});

/** A small burst of warm confetti. Mount it to play once; purely decorative. */
export function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {PIECES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: 9, height: p.round ? 9 : 14, borderRadius: p.round ? 9 : 3, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 90], opacity: [1, 1, 0], scale: 1, rotate: p.rotate }}
          transition={{ duration: 1.3, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </span>
  );
}
