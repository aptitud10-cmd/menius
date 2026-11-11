import { Fragment } from 'react';
import Behavior from './Behavior';
import Photo from './Photo';
import { MapPin, PhoneIcon, WordmarkA, WordmarkB } from './Wordmark';
import {
  ADDRESS_1,
  ADDRESS_2,
  BREAKFAST_INDEX,
  COUNTS,
  DIRECTIONS_URL,
  DISCLOSURE,
  LINKS,
  MENU_URL,
  PHONE_HREF,
  PHONE_TEXT,
  PIZARRA,
  item,
  STATES,
  STATE_COPY,
  THUMBS,
  stateForHour,
  type DayState,
  type SlotId,
} from './data';

/**
 * ISR (AD 3.3): the server computes the state, serves it in the HTML, and the
 * inline script below only corrects HTML that was cached across a boundary.
 * Reading searchParams here would make the route dynamic, so `?at=HHMM` (QA /
 * presentations) is read by the script and by Behavior.tsx only.
 */
export const revalidate = 300;

const NY_HOUR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  hourCycle: 'h23',
});

/** <1 KB, first child of .b2-root: fixes data-bd-state before first paint. */
const STATE_SCRIPT = `(function(){var r=document.currentScript.parentElement,m=location.search.match(/[?&]at=(\\d{2})(\\d{2})/),h;if(m&&+m[1]<24){h=+m[1]}else{h=parseInt(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(new Date()),10)%24}var s=h>=22||h<5?'night':h>=16?'evening':h>=11?'midday':'morning';if(r.getAttribute('data-bd-state')!==s)r.setAttribute('data-bd-state',s)})()`;

const HERO_SLOT: Record<DayState, SlotId> = {
  morning: 'D01',
  midday: 'D04',
  evening: 'D06',
  night: 'S01',
};

/** `<span data-b2-digits>` etc. are filled by Behavior; SSR renders them empty. */
function Clock() {
  return (
    <time className="b2-clock" data-b2-aria aria-live="off">
      <span className="b2-clock__d" data-b2-digits />
      <span className="b2-clock__s" data-b2-suffix />
    </time>
  );
}

function Hour({ s }: { s: DayState }) {
  return (
    <div className={`b2-hour b2-hour--${s}`}>
      <span className="b2-hour__t">{STATE_COPY[s].hourLabel}</span>
      <span className="b2-now" aria-hidden="true">
        Now — <span data-b2-time />
      </span>
    </div>
  );
}

function OpenLine() {
  return (
    <p className="b2-open">
      <strong>Open&nbsp;24/7</strong>
      <span className="b2-open__tz"> · New York time</span>
    </p>
  );
}

function Cards({ id }: { id: string }) {
  return (
    <div className="b2-cards" id={id}>
      {STATES.map((s) => (
        <a key={s} className={`b2-sv b2-sv--${s} b2-card b2-card--o`} href={STATE_COPY[s].href}>
          <span className="b2-card__t">
            {STATE_COPY[s].orderTitle}
            <span aria-hidden="true">→</span>
          </span>
          <span className="b2-card__m">
            <span className="b2-s">Pickup or delivery</span>
            <span className="b2-l">{STATE_COPY[s].orderMeta}</span>
          </span>
        </a>
      ))}
      <a
        className="b2-card b2-card--v"
        href={DIRECTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="b2-card__t">
          Come in
          <span aria-hidden="true">→</span>
        </span>
        <span className="b2-card__m">9301 Astoria Blvd</span>
      </a>
    </div>
  );
}

function Head({ title, lede }: { title: string; lede: string }) {
  return (
    <header className="b2-head">
      <h2 className="b2-d2">{title}</h2>
      <p className="b2-lg">{lede}</p>
    </header>
  );
}

const PICKS = 'Our picks for this part of the day.';

/** Framed AI composition — small, square, 1.5px ink frame (AD 6). Never animated. */
function Thumb({ src, size }: { src: string; size: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`b2-thumb b2-thumb--${size}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- already-optimized CDN asset; avoids Image Transformations quota */}
      <img src={src} alt="" width={160} height={160} loading="lazy" decoding="async" />
    </span>
  );
}

function Fig({ slot, cls, sizes, note }: { slot: SlotId; cls: string; sizes?: string; note?: string }) {
  return (
    <figure className={`b2-fig ${cls}`}>
      <Photo slot={slot} sizes={sizes} note={note} />
    </figure>
  );
}

export default function BuccaneerV2Page() {
  const state = stateForHour(Number(NY_HOUR.format(new Date())) % 24);

  return (
    <div className="b2-root b2-scroll" data-bd-state={state} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: STATE_SCRIPT }} />
      <Behavior />

      {/* ------------------------------------------------------------ header */}
      <header className="b2-hdr">
        <a className="b2-hdr__brand" href="#top" aria-label="Buccaneer Diner">
          <span className="b2-plate">
            <WordmarkA />
          </span>
        </a>
        <div className="b2-hdr__r">
          <a className="b2-hdr__tel" href={PHONE_HREF}>
            {PHONE_TEXT}
          </a>
          {STATES.map((s) => (
            <a key={s} className={`b2-sv b2-sv--${s} b2-hdr__order`} href={STATE_COPY[s].href}>
              <span className="b2-s">Order</span>
              <span className="b2-l">Order online</span>
            </a>
          ))}
        </div>
      </header>

      {/* -------------------------------------------- sticky bar (phones only) */}
      <nav className="b2-bar" aria-label="Order or call">
        {STATES.map((s) => (
          <a key={s} className={`b2-sv b2-sv--${s} b2-btn b2-btn--solid`} href={STATE_COPY[s].href}>
            Order online <span aria-hidden="true">→</span>
          </a>
        ))}
        <a className="b2-btn b2-btn--line" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
          Directions
        </a>
        <a className="b2-btn b2-btn--line b2-btn--icon" href={PHONE_HREF} aria-label={`Call ${PHONE_TEXT}`}>
          <PhoneIcon />
        </a>
      </nav>

      <main id="main">
        {/* ------------------------------------------------------------ Now */}
        <section className="b2-hero" id="top">
          <span id="b2-top-sentinel" className="b2-sentinel" aria-hidden="true" />
          <div className="b2-hero__photo">
            {STATES.map((s) => (
              <div key={s} className={`b2-sv b2-sv--${s} b2-fill`}>
                <Photo
                  slot={HERO_SLOT[s]}
                  priority={s === state}
                  sizes="(max-width: 1023px) 100vw, 60vw"
                  note={s === 'night' ? 'mobile: close crop of the word “Buccaneer” + LED line' : undefined}
                />
              </div>
            ))}
          </div>
          <div className="b2-hero__right">
            <div className="b2-hero__text">
              <div className="b2-hero__top">
                <Clock />
                <OpenLine />
              </div>
              <div className="b2-hero__mid">
                {STATES.map((s) => (
                  <p key={s} className={`b2-sv b2-sv--${s} b2-d1`}>
                    {STATE_COPY[s].phrase}
                  </p>
                ))}
                <h1 className="b2-h1">Buccaneer, a 24-hour diner on Astoria Blvd, Queens.</h1>
                <Cards id="b2-hero-cta" />
              </div>
            </div>
            <a className="b2-more" href={MENU_URL}>
              Full menu — {COUNTS.total} dishes →
            </a>
          </div>
        </section>

        {/* ------------------------------------------------ Morning — Índice */}
        <section className="b2-ch b2-morning" data-pal="day" id="morning">
          <div className="b2-m-head">
            <Hour s="morning" />
            <Head title="Mornings." lede="Breakfast all day." />
          </div>
          <div className="b2-m-idx">
            <ul className="b2-idx">
              {BREAKFAST_INDEX.map((n) => (
                <li key={n}>
                  <a href={`${MENU_URL}?category=${encodeURIComponent(n)}`}>{n}</a>
                </li>
              ))}
            </ul>
            <div className="b2-m-more">
              <a className="b2-row b2-lnk" href={LINKS.breakfast}>
                All {COUNTS.breakfast} breakfast dishes →
              </a>
              <a className="b2-row b2-lnk" href={LINKS.beverage}>
                Beverage ({COUNTS.beverage}) →
              </a>
            </div>
          </div>
          <Fig slot="D02" cls="b2-m-photo b2-reveal" sizes="100vw" />
        </section>

        {/* --------------------------------------------------- Midday — Plato */}
        <section className="b2-ch b2-mid" data-pal="day" id="midday">
          <div className="b2-mid__l">
            <Hour s="midday" />
            <Head title="Middle of the day." lede={PICKS} />
            <div className="b2-mid__dishes">
              <a className="b2-prin" href={LINKS.burgers}>
                <Thumb src={THUMBS.burgers} size="md" />
                <span className="b2-prin__t">
                  <span className="b2-d3">Burgers</span>
                  <span className="b2-meta">{COUNTS.burgers} dishes →</span>
                </span>
              </a>
              <a className="b2-prin" href={LINKS.lunch}>
                <Thumb src={THUMBS.lunch} size="md" />
                <span className="b2-prin__t">
                  <span className="b2-d3">Lunch</span>
                  <span className="b2-meta">{COUNTS.lunch} dishes →</span>
                </span>
              </a>
              <p className="b2-side b2-lg">
                <span className="b2-side__lead">On the side:</span>
                <a href={LINKS.salads}>Salads &amp; Soups ({COUNTS.salads})</a>
                <i aria-hidden="true">·</i>
                <a href={LINKS.sides}>Sides ({COUNTS.sides})</a>
                <span className="b2-side__end">.</span>
              </p>
              <p className="b2-meta b2-disc">{DISCLOSURE}</p>
            </div>
          </div>
          <Fig slot="S05a" cls="b2-mid__ph b2-reveal" sizes="(max-width: 1023px) 100vw, 40vw" />
        </section>

        {/* ------------------------------------------------- Evening — Pizarra */}
        <section className="b2-ch b2-eve" data-pal="yolk" id="evening">
          <div className="b2-eve__l">
            <Hour s="evening" />
            <Head title="Dinner." lede={PICKS} />
            <div className="b2-dinner">
              <Thumb src={THUMBS.dinner} size="lg" />
              <ul className="b2-dishes">
                {PIZARRA.dinner.map((d) => (
                  <li key={d.id}>
                    <a className="b2-d3" href={item(d.id)}>
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
              <a className="b2-row b2-lnk b2-all" href={LINKS.dinner}>
                All {COUNTS.dinner} dinner dishes →
              </a>
            </div>
          </div>
          <div className="b2-eve__r">
            <div className="b2-app">
              <div className="b2-app__thumb">
                <Thumb src={THUMBS.appetizers} size="sm" />
              </div>
              <div className="b2-app__body">
                <span className="b2-row b2-gname">Appetizers</span>
                <ul className="b2-plain">
                  {PIZARRA.appetizers.map((d) => (
                    <li key={d.id}>
                      <a className="b2-index" href={item(d.id)}>
                        {d.name}
                      </a>
                    </li>
                  ))}
                </ul>
                <a className="b2-lnk b2-allm" href={LINKS.appetizers}>
                  All {COUNTS.appetizers} →
                </a>
              </div>
            </div>
            <div className="b2-barg">
              <span className="b2-row b2-gname">Bar</span>
              <p className="b2-run">
                {PIZARRA.bar.map((d, i) => (
                  <Fragment key={d.id}>
                    {i > 0 ? <i aria-hidden="true">·</i> : null}
                    <a href={item(d.id)}>{d.name}</a>
                  </Fragment>
                ))}
              </p>
              <a className="b2-lnk b2-allm" href={LINKS.bar}>
                All {COUNTS.bar} →
              </a>
            </div>
            <Fig slot="D05" cls="b2-eve__ph b2-reveal" sizes="(max-width: 1023px) 100vw, 40vw" />
          </div>
          <p className="b2-meta b2-disc">{DISCLOSURE}</p>
        </section>

        {/* ---------------------------------------------------- Night — Par */}
        <section className="b2-ch b2-night" data-pal="sign" id="night">
          <div className="b2-night__hd">
            <Hour s="night" />
            <Head title="After dark." lede={PICKS} />
          </div>
          <div className="b2-pair">
            <a className="b2-pair__a" href={LINKS.desserts}>
              <Fig slot="D09" cls="b2-pair__ph b2-reveal" sizes="(max-width: 1023px) 50vw, 50vw" />
              <span className="b2-row">Desserts ({COUNTS.desserts}) →</span>
            </a>
            <a className="b2-pair__b" href={LINKS.bakeShop}>
              <Fig slot="S06" cls="b2-pair__ph b2-reveal" sizes="(max-width: 1023px) 50vw, 30vw" />
              <span className="b2-row">The Bake Shop ({COUNTS.bakeShop}) →</span>
            </a>
          </div>
          <p className="b2-fount">
            <a href={LINKS.fountain}>From the Fountain ({COUNTS.fountain})</a>
            <i aria-hidden="true">·</i>
            <a href={LINKS.smoothies}>Smoothies &amp; Shakes ({COUNTS.smoothies})</a>
          </p>
        </section>

        {/* ----------------------------------------------------- Una frase */}
        <section className="b2-ch b2-phrase" data-pal="day">
          <p className="b2-d2">
            {COUNTS.total}&nbsp;dishes, breakfast all day, open&nbsp;24/7. Dine in, pickup or delivery.
          </p>
        </section>

        {/* ------------------------------------------------------------ Visit */}
        <section className="b2-ch b2-visit" data-pal="sign" id="visit">
          <div className="b2-visit__video">
            <Photo slot="S02" sizes="100vw" note="video: muted loop, 6 s — mobile 4:5 · tablet/desktop 21:9" />
          </div>
          <div className="b2-visit__by">
            <Fig slot="S03" cls="b2-visit__bypic" sizes="140px" />
            <p className="b2-meta">By day.</p>
          </div>
          <div className="b2-visit__info">
            <h2 className="b2-d2">9301 Astoria Boulevard.</h2>
            <dl className="b2-dl">
              <div>
                <dt className="b2-meta">Address</dt>
                <dd className="b2-lg">
                  {ADDRESS_1}
                  <br />
                  {ADDRESS_2}
                </dd>
              </div>
              <div>
                <dt className="b2-meta">Hours</dt>
                <dd className="b2-lg">Open&nbsp;24/7</dd>
              </div>
              <div>
                <dt className="b2-meta">Phone</dt>
                <dd className="b2-lg">
                  <a className="b2-lnk" href={PHONE_HREF}>
                    {PHONE_TEXT}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="b2-meta">Service</dt>
                <dd className="b2-lg">Dine in, pickup, delivery</dd>
              </div>
            </dl>
            <div className="b2-btns">
              <a className="b2-btn b2-btn--solid b2-btn--lg" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
                Get directions <span aria-hidden="true">→</span>
              </a>
              <a className="b2-btn b2-btn--line b2-btn--lg" href={PHONE_HREF}>
                Call the diner
              </a>
            </div>
          </div>
          <div className="b2-visit__map">
            <a className="b2-map" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" aria-label="Map: 9301 Astoria Boulevard">
              <span className="b2-map__grid" aria-hidden="true" />
              <MapPin />
              <span className="b2-map__tag" aria-hidden="true">
                MAP · static OpenStreetMap render pending
              </span>
            </a>
            <p className="b2-map__src">
              <span className="b2-meta">© OpenStreetMap contributors</span>
              <a className="b2-lnk" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
                Open in Google Maps →
              </a>
            </p>
          </div>
          <div className="b2-trip">
            <figure className="b2-trip__a">
              <div className="b2-trip__ph b2-reveal">
                <Photo slot="S04" sizes="(max-width: 1023px) 100vw, 60vw" />
              </div>
              <figcaption className="b2-meta">The dining room.</figcaption>
            </figure>
            <figure className="b2-trip__b">
              <div className="b2-trip__ph b2-reveal">
                <Photo slot="S05b" sizes="(max-width: 1023px) 50vw, 30vw" />
              </div>
              <figcaption className="b2-meta">The counter.</figcaption>
            </figure>
            <figure className="b2-trip__c">
              <div className="b2-trip__ph b2-reveal">
                <Photo slot="S11" sizes="(max-width: 1023px) 50vw, 30vw" />
              </div>
              <figcaption className="b2-meta">The booth.</figcaption>
            </figure>
          </div>
        </section>

        {/* ------------------------------------------------------------ Close */}
        <section className="b2-close" id="close">
          <Fig slot="S10" cls="b2-close__ph b2-reveal" sizes="(max-width: 1023px) 100vw, 30vw" />
          <p className="b2-meta b2-close__cap">The dining room clock.</p>
          <div className="b2-close__txt">
            <div className="b2-close__clock">
              <Clock />
              <OpenLine />
            </div>
            <div className="b2-close__cta">
              <p className="b2-lg">Whatever time it is on Astoria Boulevard, we’re open.</p>
              <Cards id="b2-close-cta" />
            </div>
          </div>
        </section>
      </main>

      {/* ----------------------------------------------------------- Footer */}
      <footer className="b2-foot" data-pal="sign">
        <div className="b2-foot__brand">
          <span className="b2-plate">
            <WordmarkB />
          </span>
        </div>
        <address className="b2-foot__data">
          <span>{ADDRESS_1}</span>
          <span>{ADDRESS_2}</span>
          <a className="b2-lnk" href={PHONE_HREF}>
            {PHONE_TEXT}
          </a>
          <a className="b2-lnk" href={MENU_URL}>
            Full menu — {COUNTS.total} dishes →
          </a>
        </address>
        <div className="b2-foot__fine">
          <p className="b2-meta">{DISCLOSURE}</p>
          <p className="b2-meta">Powered by MENIUS</p>
          <p className="b2-meta">© 2026 Buccaneer Diner</p>
          <p className="b2-meta b2-struct">Structure only — real photography and wordmark v1 pending.</p>
        </div>
      </footer>
    </div>
  );
}
