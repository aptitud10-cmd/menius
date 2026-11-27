'use client';

import { useEffect } from 'react';

/**
 * Marca en el índice (legal) o en las categorías (FAQ) la sección visible:
 * solo un aria-current, sin animación. Los IntersectionObserver usan el
 * viewport, así que funcionan igual con el body scroll container (≤768px).
 * En la fila de chips, el activo se trae a la vista moviendo SOLO esa fila.
 */
export function V2ScrollSpy({ ids }: { ids: string[] }) {
  const key = ids.join(',');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const list = key.split(',').filter(Boolean);
    const linksFor = (id: string) =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>(`[data-toc] a[href="#${id}"], .chips a[href="#${id}"]`));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          list.forEach((id) => linksFor(id).forEach((a) => a.removeAttribute('aria-current')));
          linksFor(en.target.id).forEach((a) => {
            a.setAttribute('aria-current', 'true');
            const row = a.closest<HTMLElement>('.chips');
            if (row) row.scrollLeft = a.offsetLeft - 16;
          });
        });
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    list.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
  return null;
}
