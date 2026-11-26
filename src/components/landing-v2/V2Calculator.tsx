'use client';

import { useId, useState, type CSSProperties } from 'react';
import { calcKeep, usd, type CalcCopy } from '@/lib/landing-v2-copy';

const MIN = 1000;
const MAX = 30000;
const STEP = 500;
const CHIPS = [15, 20, 25, 30] as const;

/** Calculadora "What you keep": ventas en apps × comisión − tarjeta (~3%) − Pro. */
export function V2Calculator({ copy, proMonthly }: { copy: CalcCopy; proMonthly: number }) {
  const [sales, setSales] = useState(10000);
  const [pct, setPct] = useState<number>(20);
  const salesId = useId();
  const chipsId = useId();

  const r = calcKeep(sales, pct, proMonthly);
  const third = Math.round(r.third);
  const note = (third > 0 ? copy.note : copy.noteShort)
    .replace('{third}', usd(Math.abs(third)))
    .replace('{breakeven}', usd(r.breakeven));
  const p = (sales - MIN) / (MAX - MIN);

  return (
    <div className="calc">
      <div className="calc-in">
        <div className="field">
          <label htmlFor={salesId}>{copy.salesLabel}</label>
          <div className="val" aria-hidden="true">{usd(sales)}</div>
          <div className="range" style={{ '--p': p } as CSSProperties}>
            <input
              id={salesId}
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={sales}
              aria-valuetext={usd(sales)}
              onChange={(e) => setSales(Number(e.target.value))}
            />
            <div className="track" />
            <div className="fill" />
            <div className="knob" />
          </div>
          <div className="range-ends" aria-hidden="true">
            <span>{usd(MIN)}</span>
            <span>{usd(MAX)}</span>
          </div>
        </div>
        <div className="field">
          <span className="field-label" id={chipsId}>{copy.chargeLabel}</span>
          <div className="seg" role="group" aria-labelledby={chipsId}>
            {CHIPS.map((c) => (
              <button key={c} type="button" aria-pressed={pct === c} onClick={() => setPct(c)}>
                {c}%
              </button>
            ))}
          </div>
        </div>
        <p className="calc-note no-m">{note}</p>
      </div>
      <div className="calc-out">
        <div className="ln"><span>{copy.commissionLine}</span><b>{usd(r.commission)}</b></div>
        <div className="ln"><span>{copy.cardLine}</span><b>{usd(-r.card)}</b></div>
        <div className="ln"><span>{copy.proLine}</span><b>{usd(-proMonthly)}</b></div>
        <div className="keep" aria-live="polite">
          <small>{copy.keepLabel}</small>
          <b>{usd(r.keep)}<span>{copy.perMonth}</span></b>
        </div>
        <p className="calc-note only-m">{note}</p>
      </div>
    </div>
  );
}
