'use client';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { SessionProvider } from './Session';
import { ToastProvider } from './Toast';

/** reducedMotion="user": everyone who switched animations off in their system gets a still app. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
      <ToastProvider><SessionProvider>{children}</SessionProvider></ToastProvider>
    </MotionConfig>
  );
}
