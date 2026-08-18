import { useSyncExternalStore } from 'react';

/**
 * The count behind the loading meter shown after signing in.
 *
 * Real load time is unknowable, so the count decelerates towards a ceiling it
 * never reaches on its own — reaching 100 is always a signal from the app, never
 * a guess. A bar that sits full while the screen is still empty is worse than one
 * that crawls.
 */
const CEILING = 92;

let value = 0;
let finishing = false;
let running = false;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((fn) => fn());
}

function step() {
  const ceiling = finishing ? CEILING + 8 : CEILING;
  let delta = (ceiling - value) * (finishing ? 0.16 : 0.028);
  // Without a floor the deceleration stalls short of the ceiling and the number
  // appears frozen.
  if (delta < 0.08) delta = finishing ? 0.8 : 0.06;
  value = Math.min(ceiling, value + delta);

  if (finishing && value >= 99.5) {
    value = 100;
    running = false;
    emit();
    return;
  }

  emit();
  requestAnimationFrame(step);
}

function run() {
  if (running) return;
  running = true;
  requestAnimationFrame(step);
}

/** Starts a fresh count from zero. */
export function beginBootProgress() {
  value = 0;
  finishing = false;
  emit();
  run();
}

/** Runs the count out to 100. Safe to call more than once. */
export function finishBootProgress() {
  finishing = true;
  run();
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** The current count, rounded. Re-renders only when the whole number changes. */
export function useBootProgress() {
  // Rounding inside the snapshot is what keeps this cheap: the store emits every
  // frame, but React compares snapshots and skips the render when the integer is
  // unchanged.
  return useSyncExternalStore(
    subscribe,
    () => Math.round(value),
    () => 0,
  );
}
