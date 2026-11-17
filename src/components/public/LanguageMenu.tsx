'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Language switch in the header. It used to be a floating pill at the bottom
 * left (flag emoji, ~36 px, no safe-area) that could sit on the "Sections"
 * button. Flags aren't languages either: "EN" + a globe reads for everyone.
 */
export function LanguageMenu({
  locales,
  current,
  onChange,
  label,
  tone = 'light',
}: {
  locales: string[];
  current: string;
  onChange: (code: string) => void;
  /** aria-label of the button ("Change language"). */
  label: string;
  /** overlay: white on the cover photo (phone header before scrolling). */
  tone?: 'light' | 'overlay';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (locales.length < 2) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'h-10 min-w-[44px] px-2.5 inline-flex items-center justify-center gap-1 rounded-full text-[13px] font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]',
          tone === 'overlay'
            ? 'bg-black/30 backdrop-blur-sm text-white active:bg-black/50'
            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        )}
      >
        <Globe className="w-4 h-4" aria-hidden="true" />
        {current}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full mt-2 z-[80] min-w-[168px] py-1.5 bg-white rounded-2xl shadow-xl border border-gray-200"
        >
          {locales.map((code) => {
            const active = code === current;
            const name = SUPPORTED_LOCALES.find((l) => l.code === code)?.label ?? code.toUpperCase();
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  lang={code}
                  onClick={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full h-11 px-4 flex items-center justify-between gap-3 text-left text-[15px] transition-colors',
                    active ? 'font-semibold text-[#047a65]' : 'text-gray-800 hover:bg-gray-50',
                  )}
                >
                  {name}
                  {active && <Check className="w-4 h-4" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
