'use client';
import { useSyncExternalStore } from 'react';

/** Where the tour stands. Kept in sessionStorage so a reload in the middle continues the tour. */
export interface TourState { active: boolean; index: number }

const KEY = 'openmind-tour';
const listeners = new Set<() => void>();
const OFF: TourState = { active: false, index: 0 };
let state: TourState = OFF;
let loaded = false;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { state = { ...OFF, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }; } catch {}
}

function set(next: TourState) {
  state = next;
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export const tour = {
  start: () => set({ active: true, index: 0 }),
  go: (index: number) => set({ ...state, index }),
  stop: () => set(OFF),
  /** The live state, for click handlers of a bubble that may already be fading out. */
  current: () => { load(); return state; },
};

export function useTour(): TourState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => void listeners.delete(l); },
    () => { load(); return state; },
    () => OFF,
  );
}

/** For the write flow: which of its steps the tour wants to show. */
export const TOUR_WRITE_EVENT = 'openmind-tour-write';
