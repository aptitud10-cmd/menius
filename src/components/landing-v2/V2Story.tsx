import Image from 'next/image';
import type { CSSProperties } from 'react';
import { usd, WEBSITE_PRICE, PRO_MONTHLY, type LandingV2Copy } from '@/lib/landing-v2-copy';

const IMG = '/landing/v2';
/** Las capturas de teléfono son 600×1298 (390:844), mostradas a 220–290px. */
const PHONE = { width: 600, height: 1298, quality: 80 } as const;
const PHONE_SIZES = '(max-width: 640px) 206px, (max-width: 1100px) 234px, 274px';

function Stamp({ time, ampm = 'PM', when, inv }: { time: string; ampm?: string; when?: string; inv?: boolean }) {
  return (
    <span className={inv ? 'stamp inv' : 'stamp'}>
      {when ? <em>{when}</em> : null}
      {time}
      <small>{ampm}</small>
    </span>
  );
}
export { Stamp };

export function V2Zero({ c }: { c: LandingV2Copy }) {
  return (
    <section className="zero" aria-labelledby="lv2-zero">
      <div className="wrap zero-grid">
        <div className="zero-big" aria-hidden="true">0%</div>
        <div className="zero-r">
          <h2 id="lv2-zero">
            <span className="sr-only">0% </span>
            {c.zero.h2}
          </h2>
          <div className="zero-row">
            <b>{usd(PRO_MONTHLY)}</b>
            <span>{c.zero.perMonth}</span>
          </div>
          <p className="small">{c.zero.small}</p>
        </div>
      </div>
    </section>
  );
}

export function V2Story({ c }: { c: LandingV2Copy }) {
  const s = c.story;
  return (
    <section id="how" aria-labelledby="lv2-how">
      <div className="wrap story-intro">
        <h2 className="h-b" id="lv2-how">{s.h2}</h2>
        <p className="lead">{s.lead}</p>
      </div>

      <div className="wrap thread">
        <article className="beat">
          <Stamp time="7:02" />
          <div className="beat-head">
            <h3>{s.order.h3}</h3>
            <p>{s.order.p}</p>
          </div>
          <div className="tile t-order">
            <div className="phone p1">
              <div className="scr">
                <Image src={`${IMG}/store-menu-v1.webp`} alt={s.order.menuAlt} {...PHONE} sizes="(max-width: 1100px) 234px, 274px" />
              </div>
            </div>
            <div className="phone p2">
              <div className="scr">
                <Image src={`${IMG}/store-dish-v1.webp`} alt={s.order.dishAlt} {...PHONE} sizes={PHONE_SIZES} />
              </div>
            </div>
          </div>
        </article>

        <article className="beat">
          <Stamp time="7:03" />
          <div className="beat-head">
            <h3>{s.print.h3}</h3>
            <p>{s.print.p}</p>
          </div>
          <div className="tile t-print">
            <div className="tablet">
              <div className="scr">
                <Image src={`${IMG}/counter-hero-tablet-v1.webp`} alt={s.print.counterAlt} width={1120} height={1120} quality={80} sizes="(max-width: 1100px) 322px, 446px" />
              </div>
            </div>
            <div className="ticket">
              <div className="paper" style={{ '--h': '600px', '--hm': '452px' } as CSSProperties}>
                <Image src={`${IMG}/ticket-021-v1.webp`} alt={s.print.ticketAlt} width={579} height={1783} quality={85} sizes="(max-width: 640px) 236px, (max-width: 1100px) 266px, 306px" />
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="kitchen">
        <div className="wrap">
          <article className="beat">
            <Stamp time="7:04" inv />
            <div className="beat-head">
              <h3>{s.kitchen.h3}</h3>
              <p>{s.kitchen.p}</p>
            </div>
            <div className="tablet full">
              <div className="scr">
                <Image src={`${IMG}/kds-full-v1.webp`} alt={s.kitchen.fullAlt} width={2304} height={1440} quality={80} sizes="(min-width: 1281px) 1104px, calc(100vw - 176px)" />
              </div>
            </div>
            <Image className="kds-crop" src={`${IMG}/kds-021-v1.webp`} alt={s.kitchen.cropAlt} width={718} height={1304} quality={80} sizes="(max-width: 640px) calc(100vw - 54px), 340px" />
            <Image className="kds-allday" src={`${IMG}/kds-allday-v1.webp`} alt={s.kitchen.allDayAlt} width={434} height={376} quality={85} sizes="calc(100vw - 480px)" />
          </article>
        </div>
      </div>

      <div className="wrap thread">
        <div className="pair">
          <article className="beat">
            <Stamp time="7:21" />
            <h3>{s.driver.h3}</h3>
            <p>{s.driver.p}</p>
            <div className="tile">
              <div className="phone">
                <div className="scr" style={{ '--sb': '#F2F2F7', '--pt': '34px' } as CSSProperties}>
                  <Image src={`${IMG}/tracker-way-v1.webp`} alt={s.driver.alt} {...PHONE} sizes={PHONE_SIZES} />
                </div>
              </div>
            </div>
          </article>
          <article className="beat">
            <Stamp time="7:34" />
            <h3>{s.delivered.h3}</h3>
            <p>{s.delivered.p}</p>
            <div className="tile">
              <div className="phone">
                <div className="scr" style={{ '--sb': '#F2F2F7', '--pt': '34px' } as CSSProperties}>
                  <Image src={`${IMG}/tracker-done-v1.webp`} alt={s.delivered.alt} {...PHONE} sizes={PHONE_SIZES} />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function V2Site({ c }: { c: LandingV2Copy }) {
  const s = c.site;
  return (
    <section className="chap alt" aria-labelledby="lv2-site">
      <div className="wrap site-grid">
        <div className="site-copy">
          <Stamp time="9:10" ampm="AM" when={s.when} />
          <h2 className="h-b" id="lv2-site">{s.h2}</h2>
          <p className="lead">{s.lead}</p>
          <div className="site-price">
            <b>{usd(WEBSITE_PRICE)}</b>
            <span>{s.priceNote}</span>
          </div>
        </div>
        <div className="site-visual">
          <div className="browser">
            <div className="browser-bar" aria-hidden="true">
              <i /><i /><i />
              <span>thegrillhouse.com</span>
            </div>
            <Image src={`${IMG}/site-desktop-v1.webp`} alt={s.desktopAlt} width={1600} height={1000} quality={78} sizes="(max-width: 1100px) calc(100vw - 104px), 760px" />
          </div>
          <div className="phone">
            <div className="scr" style={{ '--sb': '#F4EDE2', '--pt': '30px' } as CSSProperties}>
              <Image src={`${IMG}/site-phone-v1.webp`} alt={s.phoneAlt} {...PHONE} sizes="(max-width: 640px) 236px, 160px" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
