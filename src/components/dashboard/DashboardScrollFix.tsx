'use client';

import { useEffect } from 'react';

/**
 * iOS "scroll eterno" fix — body scroll container, scoped to the dashboard only.
 *
 * iOS Safari IGNORES overscroll-behavior when the scroller is the ROOT (html),
 * leaving an empty gap that stays at the end of the page. The fix is to move the
 * scroller off the root onto <body> (see globals.css → body[data-dashboard-scroll]).
 *
 * Gemelo de StoreScrollFix. Tagea <body> con data-dashboard-scroll solo mientras
 * el dashboard está montado, y lo quita al desmontar — así landing, stores y
 * counter no se ven afectados. El header mobile del dashboard es sticky DENTRO
 * del body scroller, igual que los headers de las tiendas, así que sigue funcionando.
 */
export function DashboardScrollFix() {
  useEffect(() => {
    document.body.dataset.dashboardScroll = 'true';
    return () => {
      delete document.body.dataset.dashboardScroll;
    };
  }, []);

  return null;
}
