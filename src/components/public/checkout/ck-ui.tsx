'use client';

/**
 * Piezas del checkout premium (SPEC checkout-premium §4): grupos de filas,
 * selector segmentado, interruptor y hoja inferior. Solo presentación: la
 * lógica vive en CheckoutPageClient. Tema claro, igual que el menú público.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ckShadow = 'shadow-[0_1px_2px_rgba(17,17,20,.04),0_8px_24px_rgba(17,17,20,.06)]';
const ease = [0.32, 0.72, 0, 1] as const;

/** Tarjeta blanca que agrupa filas. Las filas seguidas llevan un filete entre ellas. */
export function CkGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-[18px] overflow-hidden [&>.ck-row+.ck-row]:border-t [&>.ck-row+.ck-row]:border-black/[0.09]',
        ckShadow,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CkIcon({ children }: { children: ReactNode }) {
  return (
    <span className="w-8 h-8 rounded-[9px] grid place-items-center bg-[#f5f5f8] text-[#4f4f57] [&>svg]:w-[17px] [&>svg]:h-[17px]" aria-hidden="true">
      {children}
    </span>
  );
}

interface CkRowProps {
  icon: ReactNode;
  label?: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Falta completar: valor en color de acento con un punto delante. */
  need?: boolean;
  /** Valor apagado (p. ej. "opcional"). */
  muted?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  id?: string;
  /** Fila-casilla: toda la fila marca/desmarca (role="checkbox"). Usar con CkCheckMark. */
  checked?: boolean;
}

export function CkRow({ icon, label, value, sub, need, muted, onClick, trailing, id, checked }: CkRowProps) {
  const body = (
    <>
      <CkIcon>{icon}</CkIcon>
      <span className="min-w-0">
        {label && <span className="block text-[12.5px] text-[#6b6b74] mb-px">{label}</span>}
        <span
          className={cn(
            'block text-base font-medium tracking-[-0.01em] truncate',
            need && 'text-[#047a65] before:content-[""] before:inline-block before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#05c8a7] before:mr-[7px] before:align-[2px]',
            muted && 'text-[#6b6b74] font-normal',
            !need && !muted && 'text-[#111114]',
          )}
        >
          {value}
        </span>
        {sub && <span className="block text-[13.5px] text-[#4f4f57] mt-px">{sub}</span>}
      </span>
      {trailing ?? (onClick ? <ChevronRight className="w-4 h-4 text-[#6b6b74]" aria-hidden="true" /> : <span />)}
    </>
  );
  const cls = 'ck-row w-full grid grid-cols-[32px_1fr_auto] items-center gap-3 px-3.5 py-3 min-h-[60px] text-left';
  if (onClick) {
    return (
      <button
        id={id}
        type="button"
        onClick={onClick}
        role={checked === undefined ? undefined : 'checkbox'}
        aria-checked={checked}
        className={cn(cls, 'transition-colors active:bg-[#f5f5f8] [@media(hover:hover)]:hover:bg-[#f5f5f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#05c8a7]')}
      >
        {body}
      </button>
    );
  }
  return <div id={id} className={cls}>{body}</div>;
}

/** Selector segmentado tipo iOS con la pastilla que se desliza. */
export function CkSegmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative grid grid-flow-col auto-cols-fr m-3 p-[3px] bg-[#f0f0f4] rounded-xl"
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] bottom-[3px] left-[3px] rounded-[9px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${idx * 100}%)`,
          transition: reduce ? 'none' : 'transform .35s cubic-bezier(.32,.72,0,1)',
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-[1] py-[11px] text-[14.5px] font-semibold rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]',
            o.value === value ? 'text-[#111114]' : 'text-[#4f4f57]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Casilla (decorativa: la fila entera es el control, ver CkRow `checked`).
 * Para "pedir algo" se lee mejor que un interruptor: apagado no parece roto.
 */
export function CkCheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'w-6 h-6 rounded-[7px] grid place-items-center transition-[background-color,box-shadow] duration-150',
        checked ? 'bg-[#05c8a7]' : 'bg-white shadow-[inset_0_0_0_2px_rgba(17,17,20,.22)]',
      )}
    >
      <svg viewBox="0 0 24 24" className={cn('w-3.5 h-3.5 transition-opacity duration-150', checked ? 'opacity-100' : 'opacity-0')} fill="none" stroke="#04241e" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

/** Botón principal: verde de la marca, 56px. */
export function ckCtaClass(disabled?: boolean) {
  return cn(
    'w-full h-14 rounded-2xl bg-[#05c8a7] text-[#04241e] text-[17px] font-semibold tracking-[-0.01em] flex items-center justify-center gap-2 transition-[transform,filter,opacity] duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047a65] focus-visible:ring-offset-2',
    disabled && 'opacity-50 pointer-events-none',
  );
}

export function CkSpinner() {
  return <span className="w-[18px] h-[18px] rounded-full border-[2.5px] border-current border-r-transparent animate-spin" aria-hidden="true" />;
}

/** Campos apilados en una caja gris (estilo iOS). El error va FUERA de la caja. */
export function CkFields({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      className={cn(
        'grid bg-[#f5f5f8] rounded-[14px] overflow-hidden [&>*+*]:border-t [&>*+*]:border-black/[0.09]',
        error && 'shadow-[inset_0_0_0_1.5px_#c4321b]',
      )}
    >
      {children}
    </div>
  );
}

export function CkError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-[13px] leading-snug text-[#c4321b] mt-1.5 mx-1">
      {children}
    </p>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hoja inferior (centrada en escritorio). X, Escape, foco atrapado y devuelto
 * al cerrar, safe area abajo. En móvil la capa sigue el área visible
 * (visualViewport) para que el teclado nunca tape ni empuje el campo.
 */
export function CkSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  closeLabel,
  desktop,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  closeLabel: string;
  desktop: boolean;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Rectángulo VISIBLE (visualViewport). Con el teclado abierto iOS no achica
  // el layout viewport: lo desplaza por su cuenta para mostrar el campo. Antes
  // sumábamos el alto del teclado como padding y la hoja subía dos veces (el
  // campo quedaba fuera de pantalla, arriba). Ahora la capa ocupa exactamente
  // lo visible: top = offsetTop, alto = vv.height. En Android (resizes-content)
  // es igual al viewport, así que no cambia nada.
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);
  const revealRef = useRef(false);
  const titleId = useRef(`ck-sheet-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>('input:not([type="hidden"]), textarea') ?? panel;
      first.focus({ preventScroll: true });
    }, 60);
    return () => {
      clearTimeout(t);
      openerRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || desktop) return;
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const update = (resized: boolean) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Solo al cambiar el alto (teclado que abre/cierra): en un `scroll` del
        // viewport no se re-enfoca, o el cliente que bajó hasta "Listo" volvía arriba.
        if (resized) revealRef.current = true;
        setVp({ top: vv.offsetTop, height: vv.height });
      });
    };
    const onResize = () => update(true);
    const onScroll = () => update(false);
    update(true);
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onScroll);
    // Sin setVp(null) al cerrar: la capa saltaba a 100dvh en plena salida.
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onScroll);
    };
  }, [open, desktop]);

  // El campo con foco tiene que quedar a la vista DENTRO de la hoja. Va después
  // de pintar el alto nuevo (useLayoutEffect sobre vp): hacerlo en el mismo rAF
  // que setVp medía con la hoja todavía alta y el email quedaba tapado.
  useLayoutEffect(() => {
    if (!revealRef.current) return;
    revealRef.current = false;
    const a = document.activeElement as HTMLElement | null;
    if (a && panelRef.current?.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) {
      a.scrollIntoView({ block: 'nearest' });
    }
  }, [vp]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const dur = reduce ? 0 : 0.42;
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-x-0 top-0 h-[100dvh] z-[60] flex items-end min-[860px]:items-center justify-center"
          style={vp ? { top: vp.top, height: vp.height } : undefined}
        >
          <motion.div
            className="absolute inset-0 bg-[rgba(10,10,14,.38)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className={cn(
              'relative w-full bg-white overflow-y-auto overscroll-contain focus:outline-none',
              // % del contenedor (= lo visible), no dvh: dvh no descuenta el teclado en iOS.
              'rounded-t-[22px] max-h-[92%] px-[18px] pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
              'min-[860px]:w-[460px] min-[860px]:rounded-[20px] min-[860px]:pb-[22px] min-[860px]:max-h-[85vh]',
            )}
            initial={desktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
            transition={{ duration: desktop ? Math.min(dur, 0.25) : dur, ease }}
          >
            <div className="w-9 h-[5px] rounded-full bg-black/[0.09] mx-auto mb-1.5 min-[860px]:invisible" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em] text-[#111114] mt-1.5 mb-1">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                // Se ve de 32 px; la zona de toque (after) mide 44 px.
                className="relative w-8 h-8 mt-1 rounded-full bg-[#f5f5f8] grid place-items-center text-[#4f4f57] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] after:absolute after:-inset-1.5 after:content-['']"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            {subtitle && <p className="text-sm text-[#4f4f57] mb-3.5">{subtitle}</p>}
            <div className={subtitle ? '' : 'mt-3'}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Opción grande dentro de una hoja (p. ej. "Lo antes posible" / "Programar"). */
export function CkChoice({ title, sub, selected, onClick, disabled }: { title: string; sub?: string; selected: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full grid grid-cols-[1fr_auto] items-center gap-3 p-3.5 text-left rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] disabled:opacity-50',
        selected ? 'bg-[#e2f7f3] shadow-[inset_0_0_0_1.5px_#05c8a7]' : 'bg-[#f5f5f8]',
      )}
    >
      <span>
        <b className="block text-base font-semibold text-[#111114]">{title}</b>
        {sub && <small className="block text-[13px] text-[#4f4f57] mt-px">{sub}</small>}
      </span>
      <span
        aria-hidden="true"
        className="w-[22px] h-[22px] rounded-full transition-shadow"
        style={{ boxShadow: selected ? 'inset 0 0 0 7px #05c8a7' : 'inset 0 0 0 2px rgba(17,17,20,.12)' }}
      />
    </button>
  );
}
