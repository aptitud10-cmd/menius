import Photo from './Photo';
import { MapPin, PhoneIcon } from './Wordmark';
import {
  ADDRESS_2,
  BREAKFAST_INDEX,
  DIRECTIONS_URL,
  LINKS,
  MENU_URL,
  PHONE2_HREF,
  PHONE2_TEXT,
  PHONE_HREF,
  PHONE_TEXT,
  PIZARRA,
  item,
  STATES,
  STATE_COPY,
  type Counts,
  type DayState,
} from './data';

/**
 * Markup that exists only in the portrait-phone "app" layout (DESIGN_MOBILE_APP_BUCCANEER_V2.md):
 * dock, Menu / Visit sheets and the hour strip + four stacked moments. Everything here is
 * `display:none` outside `APP_MQ` (see buccaneer-v2.css), so tablet and desktop never see it
 * and its images (lazy) are never requested there. Behavior lives in AppBehavior.tsx.
 */

const ICON = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  'aria-hidden': true,
  focusable: false,
} as const;

function MenuIcon() {
  return (
    <svg {...ICON}>
      <rect x="5" y="3" width="14" height="18" />
      <path d="M9 8h6M9 12h6M9 16h6" />
    </svg>
  );
}

/** Outline pin in ink (the red MapPin is only for the map inside Visit). */
function VisitIcon() {
  return (
    <svg {...ICON}>
      <path d="M12 22S5 14.8 5 9.6a7 7 0 0 1 14 0C19 14.8 12 22 12 22Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...ICON}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// --------------------------------------------------------------------- dock
export function AppDock() {
  return (
    <nav className="b2-dock" aria-label="Order, menu, call, or visit">
      {STATES.map((s) => (
        <a
          key={s}
          className={`b2-sv b2-sv--${s} b2-dock__order`}
          href={STATE_COPY[s].href}
          aria-label={STATE_COPY[s].orderTitle}
        >
          Order <span aria-hidden="true">→</span>
        </a>
      ))}
      <button
        type="button"
        className="b2-dock__it"
        data-b2-open="menu"
        aria-haspopup="dialog"
        aria-controls="b2-sheet-menu"
        aria-expanded="false"
      >
        <MenuIcon />
        <span className="b2-dock__l">Menu</span>
      </button>
      <a className="b2-dock__it" href={PHONE_HREF} aria-label={`Call ${PHONE_TEXT}`}>
        <PhoneIcon />
        <span className="b2-dock__l">Call</span>
      </a>
      <button
        type="button"
        className="b2-dock__it"
        data-b2-open="visit"
        aria-haspopup="dialog"
        aria-controls="b2-sheet-visit"
        aria-expanded="false"
      >
        <VisitIcon />
        <span className="b2-dock__l">Visit</span>
      </button>
    </nav>
  );
}

// ------------------------------------------------------------------- sheets
const MENU_GROUPS: {
  state: DayState;
  name: string;
  rows: { label: string; key: Exclude<keyof Counts, 'total'>; href: string }[];
}[] = [
  {
    state: 'morning',
    name: 'Mornings',
    rows: [
      { label: 'Breakfast', key: 'breakfast', href: LINKS.breakfast },
      { label: 'Beverage', key: 'beverage', href: LINKS.beverage },
    ],
  },
  {
    state: 'midday',
    name: 'Lunchtime',
    rows: [
      { label: 'Burgers', key: 'burgers', href: LINKS.burgers },
      { label: 'Lunch', key: 'lunch', href: LINKS.lunch },
      { label: 'Salads & Soups', key: 'salads', href: LINKS.salads },
      { label: 'Sides', key: 'sides', href: LINKS.sides },
    ],
  },
  {
    state: 'evening',
    name: 'Dinner',
    rows: [
      { label: 'Dinner', key: 'dinner', href: LINKS.dinner },
      { label: 'Appetizers', key: 'appetizers', href: LINKS.appetizers },
      { label: 'Bar', key: 'bar', href: LINKS.bar },
    ],
  },
  {
    state: 'night',
    name: 'After dark',
    rows: [
      { label: 'Desserts', key: 'desserts', href: LINKS.desserts },
      { label: 'The Bake Shop', key: 'bakeShop', href: LINKS.bakeShop },
      { label: 'From the Fountain', key: 'fountain', href: LINKS.fountain },
      { label: 'Smoothies & Shakes', key: 'smoothies', href: LINKS.smoothies },
    ],
  },
];

export function AppSheets({ counts }: { counts: Counts }) {
  return (
    <>
      <div className="b2-scrim" hidden />

      <dialog
        id="b2-sheet-menu"
        className="b2-sheet b2-sheet--menu"
        data-pal="day"
        aria-labelledby="b2-menu-t"
      >
        <div className="b2-sheet__drag" data-b2-drag>
          <div className="b2-grab" aria-hidden="true" />
          <div className="b2-sh-head">
            <h2 className="b2-d2" id="b2-menu-t" tabIndex={-1}>
              Menu
            </h2>
            <p className="b2-meta">{counts.total} dishes</p>
            <button type="button" className="b2-x" data-b2-close aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="b2-sh-list" data-b2-list>
          {MENU_GROUPS.map((g) => (
            <div key={g.state} className="b2-sh-grp">
              <div className={`b2-sh-hd b2-sh-hd--${g.state}`}>
                <span>
                  <span className="b2-sh-hd__t">{STATE_COPY[g.state].hourLabel}</span>
                  <span className="b2-sh-hd__n"> · {g.name}</span>
                </span>
                <span className={`b2-sv b2-sv--${g.state} b2-sh-now`}>
                  Now — <span data-b2-time />
                </span>
              </div>
              {g.rows.map((r) => (
                <a key={r.key} className="b2-sh-row" href={r.href}>
                  <span className="b2-row">{r.label}</span>
                  <span className="b2-meta">
                    {counts[r.key]} <span aria-hidden="true">→</span>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="b2-sh-foot">
          <a className="b2-btn b2-btn--line" href={MENU_URL}>
            Full menu — {counts.total} dishes →
          </a>
        </div>
      </dialog>

      <dialog
        id="b2-sheet-visit"
        className="b2-sheet b2-sheet--visit"
        data-pal="sign"
        aria-labelledby="b2-visit-t"
      >
        <div className="b2-sheet__drag" data-b2-drag>
          <div className="b2-grab" aria-hidden="true" />
          <div className="b2-v-title">
            <h2 className="b2-d2" id="b2-visit-t" tabIndex={-1}>
              9301 Astoria Boulevard.
            </h2>
            <button type="button" className="b2-x" data-b2-close aria-label="Close visit">
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="b2-v-body">
          <p className="b2-lg b2-v-addr">{ADDRESS_2}</p>
          <p className="b2-v-open">
            <strong>Open&nbsp;24/7</strong>
            <span className="b2-v-open__tz"> · New York time</span>
          </p>
          <div className="b2-v-btns">
            <a
              className="b2-btn b2-btn--solid"
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions <span aria-hidden="true">→</span>
            </a>
            <a className="b2-btn b2-btn--line" href={PHONE_HREF}>
              Call the diner
            </a>
          </div>
          <a
            className="b2-map b2-v-map"
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open 9301 Astoria Boulevard in Google Maps"
          >
            {/* High-contrast copy of the site map (streets at 0.85/1 opacity); static SVG, nothing to optimize. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="b2-map__img"
              src="/buccaneer/v2/app-mapa-astoria-hc.svg"
              alt=""
              width={1000}
              height={1000}
              loading="lazy"
              decoding="async"
            />
            <MapPin />
          </a>
          <p className="b2-map__src">
            <span className="b2-meta b2-map__attr">© OpenStreetMap contributors</span>
            <a className="b2-lnk" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
              Open in Google Maps →
            </a>
          </p>
          <div className="b2-v-sec">
            <p className="b2-meta">Phone</p>
            <a className="b2-lg b2-lnk" href={PHONE_HREF}>
              {PHONE_TEXT}
            </a>
            <a className="b2-lg b2-lnk" href={PHONE2_HREF}>
              {PHONE2_TEXT}
            </a>
          </div>
          <div className="b2-v-sec">
            <p className="b2-meta">Service</p>
            <p className="b2-lg">Dine-in, pickup, or delivery</p>
          </div>
          <div className="b2-v-sec">
            <p className="b2-meta">Parking</p>
            <p className="b2-lg">Free lot for customers</p>
          </div>
        </div>
      </dialog>
    </>
  );
}

// -------------------------------------------------- hour strip + the 4 moments
const TABS: { s: DayState; name: string }[] = [
  { s: 'morning', name: 'Mornings' },
  { s: 'midday', name: 'Lunchtime' },
  { s: 'evening', name: 'Dinner' },
  { s: 'night', name: 'After dark' },
];

export function AppDays({ counts }: { counts: Counts }) {
  return (
    <div className="b2-days">
      <nav className="b2-strip" aria-label="The day">
        <div className="b2-tabs">
          {TABS.map((t) => (
            <a key={t.s} className={`b2-tab b2-tab--${t.s}`} href={`#b2-sec-${t.s}`}>
              <span className="b2-tab__h">{STATE_COPY[t.s].hourLabel}</span>
              <span className="b2-tab__name">{t.name}</span>
              <span className="b2-tab__now">
                Now<span className="b2-sr"> ({t.name})</span>
              </span>
            </a>
          ))}
          <span className="b2-tabs__bar" aria-hidden="true" />
        </div>
      </nav>

      {/* ---------------------------------------------------------- Mornings */}
      <section className="b2-sec" data-pal="day" id="b2-sec-morning">
        <div className="b2-sec__ph">
          <Photo slot="D02" file="/buccaneer/v2/app-sec-morning.webp" sizes="100vw" />
        </div>
        <div className="b2-sec__b">
          <h2 className="b2-d2">Mornings.</h2>
          <p className="b2-sec__lede">Breakfast all day.</p>
          <div className="b2-sec__list">
            <ul className="b2-sec__idx">
              {BREAKFAST_INDEX.slice(0, 6).map((n) => (
                <li key={n}>
                  <a className="b2-index" href={`${MENU_URL}?category=${encodeURIComponent(n)}`}>
                    <span aria-hidden="true">· </span>
                    {n}
                  </a>
                </li>
              ))}
            </ul>
            <a className="b2-row b2-sec__r" href={LINKS.breakfast}>
              All {counts.breakfast} breakfast dishes →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.beverage}>
              Coffee &amp; drinks ({counts.beverage}) →
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Lunchtime */}
      <section className="b2-sec" data-pal="day" id="b2-sec-midday">
        <div className="b2-sec__ph">
          {/* One burger per page: at midday the hero already shows it, so the counter takes its place. */}
          <div className="b2-sv b2-sv--morning b2-sv--evening b2-sv--night b2-fill">
            <Photo slot="D04" file="/buccaneer/v2/app-sec-lunch.webp" sizes="100vw" />
          </div>
          <div className="b2-sv b2-sv--midday b2-fill">
            <Photo slot="S05a" sizes="100vw" />
          </div>
        </div>
        <div className="b2-sec__b">
          <h2 className="b2-d2">Lunchtime.</h2>
          <p className="b2-sec__lede">Burgers, sandwiches, salads, and soups.</p>
          <div className="b2-sec__list">
            <a className="b2-sec__big" href={LINKS.burgers}>
              <span className="b2-d3">Burgers</span>
              <span className="b2-meta">{counts.burgers} dishes →</span>
            </a>
            <a className="b2-sec__big" href={LINKS.lunch}>
              <span className="b2-d3">Lunch</span>
              <span className="b2-meta">{counts.lunch} dishes →</span>
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.salads}>
              Salads &amp; Soups ({counts.salads}) →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.sides}>
              Sides ({counts.sides}) →
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Dinner */}
      <section className="b2-sec" data-pal="yolk" id="b2-sec-evening">
        <div className="b2-sec__ph">
          <Photo slot="D06" file="/buccaneer/v2/app-sec-dinner.webp" sizes="100vw" />
        </div>
        <div className="b2-sec__b">
          <h2 className="b2-d2">Dinner.</h2>
          <p className="b2-sec__lede">A few picks from the dinner menu.</p>
          <div className="b2-sec__list">
            {PIZARRA.dinner.slice(0, 3).map((d) => (
              <a key={d.id} className="b2-row b2-sec__r" href={item(d.id)}>
                {d.name}
              </a>
            ))}
            <a className="b2-row b2-sec__r" href={LINKS.dinner}>
              All {counts.dinner} dinner dishes →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.appetizers}>
              Appetizers ({counts.appetizers}) →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.bar}>
              Bar ({counts.bar}) →
            </a>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- After dark */}
      <section className="b2-sec" data-pal="sign" id="b2-sec-night">
        <div className="b2-sec__ph b2-sec__mos">
          <a href={LINKS.desserts} tabIndex={-1} aria-hidden="true">
            <Photo slot="D09" file="/buccaneer/v2/app-sec-torta.webp" sizes="50vw" />
          </a>
          <a href={LINKS.bakeShop} tabIndex={-1} aria-hidden="true">
            <Photo slot="S06" file="/buccaneer/v2/vitrina-bake-shop.webp" position="50% 40%" sizes="50vw" />
          </a>
        </div>
        <div className="b2-sec__b">
          <h2 className="b2-d2">After dark.</h2>
          <p className="b2-sec__lede">Something sweet.</p>
          <div className="b2-sec__list">
            <a className="b2-row b2-sec__r" href={LINKS.desserts}>
              Desserts ({counts.desserts}) →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.bakeShop}>
              The Bake Shop ({counts.bakeShop}) →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.fountain}>
              From the Fountain ({counts.fountain}) →
            </a>
            <a className="b2-row b2-sec__r" href={LINKS.smoothies}>
              Smoothies &amp; Shakes ({counts.smoothies}) →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
