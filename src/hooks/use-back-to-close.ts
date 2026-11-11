'use client';

import { useEffect, useRef } from 'react';

/**
 * System back (Android back button, iOS edge swipe, browser ←) closes the
 * overlay on top instead of leaving the page — the biggest "this is a website,
 * not an app" tell on a phone. Without it, a customer who opens a dish and
 * swipes back is thrown out of the menu entirely.
 *
 * How it works: opening an overlay pushes one same-URL history entry tagged
 * with `meniusOverlay: <seq>`. Back pops it and we close the overlay. Closing
 * from the UI (X, swipe, backdrop) pops the entry ourselves with history.back()
 * so the stack never accumulates dead entries.
 *
 * All bookkeeping is module-level (one history per tab), so stacked overlays
 * from different hooks cooperate: product sheet over search → back closes only
 * the product sheet.
 *
 * Next.js App Router notes (14.2):
 * - The new entry copies `history.state` (which holds Next's `__NA` + tree) and
 *   adds our key. Next's popstate handler reloads the page on any entry without
 *   `__NA`, so a bare `{ meniusOverlay }` state would cause a full reload.
 * - No URL is passed to pushState, so Next's patched pushState does not
 *   dispatch a navigation — the router never notices the entry.
 * - Never router.push/replace from here: those would re-render the route.
 */

const STATE_KEY = 'meniusOverlay';
/** Safety net if a popstate we caused never arrives (should not happen). */
const POP_TIMEOUT_MS = 1000;

interface OverlayEntry {
  seq: number;
  /** Closed by the UI while another overlay sat above it: its history entry is
   *  still there and gets popped together with the one above. */
  closed: boolean;
  /** Called when the user pressed back and this overlay must close. */
  close: () => void;
}

/** Overlays whose history entries are currently pushed, bottom → top. */
const stack: OverlayEntry[] = [];
/** Overlays opened while one of our own back() calls was still in flight. A
 *  pushState issued before that traversal lands would be undone by it, so the
 *  push waits for the popstate. */
const queue: OverlayEntry[] = [];
/** popstate events we caused ourselves and must not treat as user back. */
let pendingPops = 0;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
const idleWaiters: Array<() => void> = [];
let lastSeq = 0;
let listening = false;

/** Monotonic across reloads (Date.now based): after a reload the tab may still
 *  hold entries tagged by the previous page, and the "close everything above
 *  the entry we landed on" rule needs new entries to sort above old ones. */
function nextSeq(): number {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
}

function readSeq(state: unknown): number {
  if (state && typeof state === 'object') {
    const v = (state as Record<string, unknown>)[STATE_KEY];
    if (typeof v === 'number') return v;
  }
  return 0;
}

function settleIfIdle() {
  if (pendingPops > 0) return;
  clearTimeout(pendingTimer);
  pendingTimer = undefined;
  while (queue.length > 0) {
    const entry = queue.shift();
    if (entry) pushEntry(entry);
  }
  while (idleWaiters.length > 0) idleWaiters.shift()?.();
}

function expectPop() {
  pendingPops += 1;
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingPops = 0;
    settleIfIdle();
  }, POP_TIMEOUT_MS);
}

function onPopState(e: PopStateEvent) {
  if (pendingPops > 0) {
    pendingPops -= 1;
    settleIfIdle();
    return;
  }
  // User navigation: close every overlay whose entry is above the one we
  // landed on (a long-press on back can skip several entries at once).
  const landed = readSeq(e.state);
  while (stack.length > 0 && stack[stack.length - 1].seq > landed) {
    const entry = stack.pop();
    if (entry && !entry.closed) entry.close();
  }
}

function ensureListening() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', onPopState);
}

function pushEntry(entry: OverlayEntry) {
  const current: unknown = window.history.state;
  const base =
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)
      : {};
  window.history.pushState({ ...base, [STATE_KEY]: entry.seq }, '');
  stack.push(entry);
}

function openEntry(entry: OverlayEntry) {
  ensureListening();
  if (pendingPops > 0) queue.push(entry);
  else pushEntry(entry);
}

/** Overlay closed by the UI: drop its history entry (and any closed entries
 *  directly under it) so back does not land on a dead entry. */
function releaseEntry(entry: OverlayEntry) {
  const q = queue.indexOf(entry);
  if (q !== -1) {
    queue.splice(q, 1);
    return;
  }
  if (!stack.includes(entry)) return;
  entry.closed = true;
  let count = 0;
  while (stack.length > 0 && stack[stack.length - 1].closed) {
    stack.pop();
    count += 1;
  }
  if (count > 0) {
    expectPop();
    window.history.go(-count);
  }
}

/** Unmount (route change, error boundary): forget the entry without touching
 *  history — a navigation may already have pushed something above it. */
function dropEntry(entry: OverlayEntry) {
  const q = queue.indexOf(entry);
  if (q !== -1) queue.splice(q, 1);
  const s = stack.indexOf(entry);
  if (s !== -1) stack.splice(s, 1);
}

/**
 * Call right before a programmatic navigation away from the page (e.g. to
 * checkout) while overlays may be open. Pops all of our entries first so the
 * new page is pushed on top of the real menu entry — otherwise back from
 * checkout would land on a dead overlay entry and need a second tap.
 * Resolves once history has settled; navigate in the `.then`.
 * Overlays closed by the caller after this call do not trigger another back.
 */
export function unwindOverlayHistory(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  queue.length = 0;
  const count = stack.length;
  stack.length = 0;
  if (count > 0) {
    expectPop();
    window.history.go(-count);
  }
  if (pendingPops === 0) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}

/**
 * While `open` is true the overlay owns one history entry; system back calls
 * `onClose`. When `open` turns false through the UI, the entry is removed.
 * `onClose` must actually set `open` to false.
 */
export function useBackToClose(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const entryRef = useRef<OverlayEntry | null>(null);

  useEffect(() => {
    if (open && !entryRef.current) {
      const entry: OverlayEntry = {
        seq: nextSeq(),
        closed: false,
        close: () => {
          // Entry already popped by the browser: clear it first so the
          // open→false effect below does not call history.back() again.
          entryRef.current = null;
          onCloseRef.current();
        },
      };
      entryRef.current = entry;
      openEntry(entry);
    } else if (!open && entryRef.current) {
      const entry = entryRef.current;
      entryRef.current = null;
      releaseEntry(entry);
    }
  }, [open]);

  useEffect(
    () => () => {
      if (entryRef.current) {
        dropEntry(entryRef.current);
        entryRef.current = null;
      }
    },
    [],
  );
}
