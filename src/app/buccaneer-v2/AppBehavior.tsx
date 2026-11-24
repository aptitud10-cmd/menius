'use client';

import { useEffect } from 'react';
import { APP_MQ, STATES, type DayState } from './data';

/**
 * Client behavior of the portrait-phone "app" layout (AppMobile.tsx): header clock,
 * hour strip <-> moments, and the Menu / Visit sheets. Gated by APP_MQ; on any other
 * viewport it does nothing (and tears down if the viewport leaves the query).
 *
 * The scroller is `.b2-root.b2-scroll` itself (not window): read `scrollTop` and call
 * `scrollTo` on it. Observers use the viewport as root. No scroll listeners.
 */

type SheetName = 'menu' | 'visit';
const SHEETS: SheetName[] = ['menu', 'visit'];

function init(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hdr = root.querySelector<HTMLElement>('.b2-hdr');
  const dock = root.querySelector<HTMLElement>('.b2-dock');
  const stateIdx = () =>
    Math.max(0, STATES.indexOf((root.getAttribute('data-bd-state') ?? 'morning') as DayState));

  // ------------------------------------------------------------ header clock
  // Shown only while neither the Now clock nor the Close clock is on screen (R1.9).
  const clocks = Array.from(root.querySelectorAll<HTMLElement>('.b2-hero .b2-clock, .b2-close .b2-clock'));
  if (hdr && clocks.length) {
    const seen = new Map<Element, boolean>();
    let clockIo: IntersectionObserver | undefined;
    const buildClock = () => {
      clockIo?.disconnect();
      const top = Math.round(hdr.getBoundingClientRect().bottom);
      const bottom = Math.round(dock?.getBoundingClientRect().height ?? 0);
      clockIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => seen.set(e.target, e.isIntersecting));
          root.toggleAttribute('data-hclock', !Array.from(seen.values()).some(Boolean));
        },
        { rootMargin: `-${top}px 0px -${bottom}px 0px` },
      );
      clocks.forEach((c) => {
        seen.set(c, true);
        clockIo?.observe(c);
      });
    };
    buildClock();
    cleanups.push(() => {
      clockIo?.disconnect();
      root.removeAttribute('data-hclock');
    });
    window.addEventListener('resize', buildClock);
    cleanups.push(() => window.removeEventListener('resize', buildClock));
  }

  // ------------------------------------------------------------- hour strip
  const strip = root.querySelector<HTMLElement>('.b2-strip');
  const tabs = Array.from(root.querySelectorAll<HTMLAnchorElement>('.b2-strip .b2-tab'));
  const secs = Array.from(root.querySelectorAll<HTMLElement>('.b2-sec'));
  if (hdr && strip && tabs.length === secs.length && secs.length > 0) {
    let lockUntil = 0;
    const setOn = (i: number) => {
      strip.dataset.on = String(i);
      tabs.forEach((t, j) => {
        if (j === i) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
    };
    setOn(stateIdx());

    let io: IntersectionObserver | undefined;
    const build = () => {
      io?.disconnect();
      const top = Math.round(hdr.getBoundingClientRect().bottom + strip.getBoundingClientRect().height);
      const vh = window.innerHeight;
      // A 2px band right under the strip: the moment crossing it is the one "on screen".
      io = new IntersectionObserver(
        (entries) => {
          if (performance.now() < lockUntil) return;
          for (const e of entries) {
            const i = secs.indexOf(e.target as HTMLElement);
            if (e.isIntersecting) setOn(i);
            else if (i === 0 && e.boundingClientRect.top > top) setOn(stateIdx());
          }
        },
        { rootMargin: `-${top}px 0px -${Math.max(0, vh - top - 2)}px 0px` },
      );
      secs.forEach((s) => io?.observe(s));
    };
    build();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    };
    window.addEventListener('resize', onResize);

    const onTab = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a.b2-tab');
      if (!a) return;
      const i = tabs.indexOf(a);
      const sec = secs[i];
      if (!sec) return;
      e.preventDefault();
      const top = hdr.getBoundingClientRect().bottom + strip.getBoundingClientRect().height;
      lockUntil = performance.now() + (reduce.matches ? 80 : 700);
      setOn(i);
      root.scrollTo({
        top: root.scrollTop + sec.getBoundingClientRect().top - top,
        behavior: reduce.matches ? 'auto' : 'smooth',
      });
    };
    strip.addEventListener('click', onTab);
    cleanups.push(() => {
      io?.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      strip.removeEventListener('click', onTab);
      strip.removeAttribute('data-on');
      tabs.forEach((t) => t.removeAttribute('aria-current'));
    });
  }

  // ------------------------------------------------------------------ sheets
  const scrim = root.querySelector<HTMLElement>('.b2-scrim');
  const dialogs = {} as Record<SheetName, HTMLDialogElement | null>;
  const openers = {} as Record<SheetName, HTMLButtonElement | null>;
  for (const n of SHEETS) {
    dialogs[n] = root.querySelector<HTMLDialogElement>(`#b2-sheet-${n}`);
    openers[n] = root.querySelector<HTMLButtonElement>(`[data-b2-open="${n}"]`);
  }
  if (scrim && dialogs.menu && dialogs.visit) {
    const scrimEl = scrim;
    const inertEls = [root.querySelector('main'), hdr, root.querySelector('.b2-foot')];
    const cleanUrl = () => window.location.pathname + window.location.search;
    const hashName = (): SheetName | null =>
      window.location.hash === '#menu' ? 'menu' : window.location.hash === '#visit' ? 'visit' : null;

    let current: SheetName | null = null;
    let pushed = false;
    let fastClose = false;
    let pending: (() => void) | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;

    const setDock = (active: SheetName | null) => {
      for (const n of SHEETS) {
        const b = openers[n];
        if (!b) continue;
        b.setAttribute('aria-expanded', String(n === active));
        if (n === active) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      }
    };

    const flushPending = () => {
      if (!pending) return;
      clearTimeout(pendingTimer);
      const run = pending;
      pending = null;
      run();
    };

    const open = (name: SheetName, mode: 'user' | 'pop' | 'init') => {
      const dlg = dialogs[name];
      if (!dlg || current === name) return;
      flushPending();
      const swapping = current !== null;
      if (current) {
        const prev = dialogs[current];
        prev?.classList.remove('is-in');
        prev?.close();
        prev?.classList.remove('is-swap');
      }
      dlg.classList.toggle('is-swap', swapping);
      dlg.style.transform = '';
      dlg.style.transition = '';
      dlg.show();
      current = name;
      root.setAttribute('data-sheet', name);
      inertEls.forEach((el) => el?.toggleAttribute('inert', true));
      scrimEl.hidden = false;
      setDock(name);

      if (name === 'menu') {
        const list = dlg.querySelector<HTMLElement>('[data-b2-list]');
        if (list) {
          list.scrollTop = 0;
          const s = root.getAttribute('data-bd-state');
          const h = list.querySelector<HTMLElement>(`.b2-sh-hd--${s}`);
          if (h && (s === 'evening' || s === 'night')) list.scrollTop = h.offsetTop;
        }
      }
      dlg.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });

      // Two frames so the closed->open transform transition runs (display:none -> flex).
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (current !== name) return;
          dlg.classList.add('is-in');
          scrimEl.classList.add('is-in');
        }),
      );

      if (mode === 'user') {
        if (pushed) window.history.replaceState({ b2sheet: name }, '', `#${name}`);
        else {
          window.history.pushState({ b2sheet: name }, '', `#${name}`);
          pushed = true;
        }
      } else if (mode === 'init') {
        window.history.replaceState(null, '', cleanUrl());
        window.history.pushState({ b2sheet: name }, '', `#${name}`);
        pushed = true;
      } else {
        pushed = true;
      }
    };

    const closeAnimated = () => {
      const name = current;
      if (!name) return;
      const dlg = dialogs[name];
      current = null;
      pushed = false;
      setDock(null);
      scrimEl.classList.remove('is-in');
      const fast = fastClose;
      fastClose = false;
      if (dlg) {
        dlg.classList.remove('is-in');
        if (!fast) {
          dlg.style.transform = '';
          dlg.style.transition = '';
        }
      }
      const wasFocusInside = !document.activeElement || document.activeElement === document.body || !!dlg?.contains(document.activeElement);
      pending = () => {
        dlg?.close();
        dlg?.classList.remove('is-swap');
        if (dlg) {
          dlg.style.transform = '';
          dlg.style.transition = '';
        }
        scrimEl.hidden = true;
        root.removeAttribute('data-sheet');
        inertEls.forEach((el) => el?.removeAttribute('inert'));
        if (wasFocusInside) openers[name]?.focus({ preventScroll: true });
      };
      pendingTimer = setTimeout(flushPending, fast ? 0 : reduce.matches ? 120 : 200);
    };

    const closeByUser = (fast = false) => {
      if (!current) return;
      fastClose = fast;
      if (pushed) {
        // popstate closes it, so "back" and the X leave the same history behind
        window.history.back();
      } else {
        closeAnimated();
      }
    };

    const onPop = () => {
      const n = hashName();
      if (n && n !== current) open(n, 'pop');
      else if (!n && current) closeAnimated();
    };
    window.addEventListener('popstate', onPop);

    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      const op = t.closest<HTMLElement>('[data-b2-open]');
      if (op) {
        const n = op.getAttribute('data-b2-open') as SheetName;
        if (current === n) closeByUser();
        else open(n, 'user');
        return;
      }
      if (t.closest('[data-b2-close]')) closeByUser();
    };
    root.addEventListener('click', onClick);
    const onScrim = () => closeByUser();
    scrimEl.addEventListener('click', onScrim);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && current) {
        e.preventDefault();
        closeByUser();
      }
    };
    document.addEventListener('keydown', onKey);

    // Drag down from the grabber/head only (never from the list, so it never fights its scroll).
    const dragCleanups: (() => void)[] = [];
    for (const n of SHEETS) {
      const dlg = dialogs[n];
      const zone = dlg?.querySelector<HTMLElement>('[data-b2-drag]');
      if (!dlg || !zone) continue;
      let id = -1;
      let startY = 0;
      let lastY = 0;
      let lastT = 0;
      let vel = 0;
      let dy = 0;
      const down = (e: PointerEvent) => {
        if (!e.isPrimary || (e.target as Element).closest('button')) return;
        id = e.pointerId;
        startY = lastY = e.clientY;
        lastT = e.timeStamp;
        vel = dy = 0;
        zone.setPointerCapture(id);
        dlg.style.transition = 'none';
      };
      const move = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        dy = Math.max(0, e.clientY - startY);
        const dt = e.timeStamp - lastT;
        if (dt > 0) vel = (e.clientY - lastY) / dt;
        lastY = e.clientY;
        lastT = e.timeStamp;
        dlg.style.transform = `translateY(${dy}px)`;
      };
      const up = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        id = -1;
        if (e.type === 'pointerup' && (dy > 96 || vel > 0.5)) {
          dlg.style.transition = 'transform 180ms cubic-bezier(0.4, 0, 1, 1)';
          dlg.style.transform = 'translateY(100%)';
          scrimEl.classList.remove('is-in');
          setTimeout(() => closeByUser(true), 180);
        } else {
          dlg.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
          dlg.style.transform = '';
          setTimeout(() => {
            dlg.style.transition = '';
          }, 220);
        }
      };
      zone.addEventListener('pointerdown', down);
      zone.addEventListener('pointermove', move);
      zone.addEventListener('pointerup', up);
      zone.addEventListener('pointercancel', up);
      dragCleanups.push(() => {
        zone.removeEventListener('pointerdown', down);
        zone.removeEventListener('pointermove', move);
        zone.removeEventListener('pointerup', up);
        zone.removeEventListener('pointercancel', up);
      });
    }

    const initial = hashName();
    if (initial) open(initial, 'init');

    cleanups.push(() => {
      window.removeEventListener('popstate', onPop);
      root.removeEventListener('click', onClick);
      scrimEl.removeEventListener('click', onScrim);
      document.removeEventListener('keydown', onKey);
      dragCleanups.forEach((f) => f());
      // Leaving the app layout (rotation, resize): put everything back
      clearTimeout(pendingTimer);
      pending = null;
      for (const n of SHEETS) {
        dialogs[n]?.close();
        dialogs[n]?.classList.remove('is-in', 'is-swap');
        dialogs[n]?.removeAttribute('style');
      }
      scrimEl.classList.remove('is-in');
      scrimEl.hidden = true;
      root.removeAttribute('data-sheet');
      inertEls.forEach((el) => el?.removeAttribute('inert'));
      setDock(null);
    });
  }

  return () => cleanups.forEach((f) => f());
}

export default function AppBehavior() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.b2-root');
    if (!root) return;
    const mq = window.matchMedia(APP_MQ);
    let teardown: (() => void) | undefined;
    const sync = () => {
      teardown?.();
      teardown = mq.matches ? init(root) : undefined;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      teardown?.();
    };
  }, []);

  return null;
}
