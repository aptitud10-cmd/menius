'use client';

import { useEffect } from 'react';

/**
 * iOS "scroll eterno" fix — body scroll container, scoped to store pages only.
 *
 * iOS Safari IGNORES overscroll-behavior when the scroller is the ROOT (html),
 * leaving an empty gap that stays at the end of the page. The fix is to move the
 * scroller off the root onto <body> (see globals.css → body[data-store-scroll]).
 *
 * We can't apply this globally: doing it on <body> for the whole app previously
 * broke the dashboard/counter sticky headers. So this component tags <body> with
 * data-store-scroll only while a store page (menu/checkout/order/etc.) is mounted,
 * and removes the tag on unmount so the dashboard is never affected.
 */
export function StoreScrollFix() {
  useEffect(() => {
    document.body.dataset.storeScroll = 'true';
    return () => {
      delete document.body.dataset.storeScroll;
    };
  }, []);

  return null;
}
