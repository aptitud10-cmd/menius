'use client';

import { useId, useState, type ReactNode } from 'react';
import { useIsPhone } from './use-is-phone';

/**
 * En desktop/tablet todo está abierto y el título es texto. En celular (≤640)
 * el título pasa a ser un botón que abre y cierra. Antes de hidratar, el CSS
 * ya muestra el "+" y oculta lo cerrado (data-open), así no hay salto.
 */
function Toggle({
  open,
  onToggle,
  controls,
  className,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  className: string;
  children: ReactNode;
}) {
  const isPhone = useIsPhone();
  if (!isPhone) return <span className={className}>{children}</span>;
  return (
    <button type="button" className={className} aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      {children}
    </button>
  );
}

export function V2FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [touched, setTouched] = useState(false);
  const id = useId();
  const toggle = () => {
    setTouched(true);
    setOpen((o) => !o);
  };
  return (
    <div className="qa" data-open={open ? 'true' : 'false'} data-initial={defaultOpen && !touched ? 'true' : undefined}>
      <h3>
        <Toggle open={open} onToggle={toggle} controls={id} className="qa-btn">
          {q}
        </Toggle>
      </h3>
      <p id={id}>{a}</p>
    </div>
  );
}

export function V2FeatureGroup({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="fg" data-open={open ? 'true' : 'false'}>
      <h3 className="fg-h">
        <Toggle open={open} onToggle={() => setOpen((o) => !o)} controls={id} className="fg-sum">
          {title}
        </Toggle>
      </h3>
      <ul id={id}>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
