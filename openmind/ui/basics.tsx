'use client';
import { motion } from 'motion/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Fades and lifts its content in. `index` staggers items of a list. */
export function Reveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.05, type: 'spring', stiffness: 300, damping: 30 }}>
      {children}
    </motion.div>
  );
}

export function Pill({ active, children, ...rest }: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="pill" aria-pressed={Boolean(active)} {...rest}>{children}</button>;
}

/** Icon-only button. `label` is required because there is no visible text. */
export function IconButton({ label, children, ...rest }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="icon-btn" aria-label={label} {...rest}>{children}</button>;
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | string }) {
  return <div className="skeleton" aria-hidden style={{ height, width }} />;
}

/** Placeholder with the shape of a content card while data loads. */
export function CardSkeleton() {
  return (
    <div className="card grid gap-3" role="status" aria-label="Lädt">
      <Skeleton width={90} height={20} />
      <Skeleton height={22} />
      <Skeleton width="70%" />
    </div>
  );
}
