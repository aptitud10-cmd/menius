'use client';

import { useEffect, useState } from 'react';

/** ≤640px: el corte "celular" de la maqueta (acordeones, CTA fijo, menú). */
export const PHONE_QUERY = '(max-width: 640px)';

/**
 * false en el servidor y en el primer render (desktop), y el valor real tras
 * montar. Los acordeones dibujan su estado inicial con CSS por media query,
 * así que este valor solo decide la semántica (aria-expanded / disabled).
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isPhone;
}
