import type { ReactNode } from 'react';
import Image from 'next/image';
import Photo from './Photo';
import type { FavoritePrices } from './favorites';
import { MapPin, PhoneIcon } from './Wordmark';
import {
  ADDRESS_1,
  ADDRESS_2,
  DIRECTIONS_URL,
  FAVORITES,
  LINKS,
  MENU_URL,
  PHONE2_HREF,
  PHONE2_TEXT,
  PHONE_HREF,
  PHONE_TEXT,
  REVIEWS_URL,
  item,
  STATES,
  STATE_COPY,
  type Counts,
  type DayState,
} from './data';

/**
 * The story-led page (copy approved 2026-11-24; mockup in scripts/.product-output/app-mobile/v3):
 * hero extras (chip, seal, sub + buttons) and the sections Story, Where to start, A day, Reviews,
 * Catering, Visit. They render at every size and each size lays them out in buccaneer-v2.css
 * (portrait phones: APP LAYOUT; tablet and desktop: STORY-LED LAYOUT). Only the dock and the
 * Menu / Visit sheets are phone-only: `display:none` outside `APP_MQ`. Phones in landscape keep
 * the older chapters. Images are lazy, so what a layout hides is never requested. Behavior lives
 * in AppBehavior.tsx.
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

/** D05 (calamari in the jukebox booth) cut to the 4:5 scene box; stands in on phones when the hero already shows the scene's own dish. Tablet and desktop use S05b there (D05 shows a third-party ad card). */
const BOOTH_SCENE = '/buccaneer/v2/app-scene-booth.webp';

/**
 * `sizes` of the scene photos: horizontal scenes (1, 3), the tall one (2) and the last one (4).
 * Phones: 85vw as before. On a tablet the boxes are ~60% of the width (they bleed off the edge).
 */
const SCENE_WIDE = '(max-width: 719px) 85vw, (max-width: 1023px) 62vw, (max-width: 1919px) 55vw, 800px';
const SCENE_TALL = '(max-width: 719px) 85vw, 480px';
const SCENE_LAST = '(max-width: 719px) 85vw, (max-width: 1023px) 62vw, 40vw';

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
              93-01 Astoria Boulevard.
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
            aria-label="Open 93-01 Astoria Boulevard in Google Maps"
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

// ------------------------------------------------------------- hero extras
/** Live time + the hour's line, on the hero photo. Also the header clock's "is the hero on screen" probe. */
export function AppChip() {
  return (
    <span className="b2-chip" aria-hidden="true">
      <b data-b2-time />
      {STATES.map((s) => (
        <span key={s} className={`b2-sv b2-sv--${s}`}>
          {' '}— {STATE_COPY[s].phrase}
        </span>
      ))}
    </span>
  );
}

/** The 50-year seal (1976–2026). Decorative: the same facts are in the eyebrow and the story. */
export function AppSeal() {
  return (
    <span className="b2-seal" aria-hidden="true">
      <svg viewBox="0 0 120 120" focusable="false">
        <defs>
          <path id="b2-seal-c" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1 -90 0" />
        </defs>
        <text>
          <textPath href="#b2-seal-c">· SINCE 1976 · ASTORIA BOULEVARD · QUEENS NY </textPath>
        </text>
      </svg>
      <span className="b2-seal__n">50</span>
      <span className="b2-seal__y">years</span>
    </span>
  );
}

export function AppHeroText() {
  return (
    <div className="b2-ahero">
      {/* "Since 1976" lives on the seal right above; the line must stay clear of it */}
      <p className="b2-eyebrow">Open 24/7 · Queens, NY</p>
      <h1 className="b2-ah1">Fifty years on Astoria Boulevard.</h1>
      <p className="b2-ahero__sub">
        A diner that never turns the lights off. 400+ dishes, cakes baked in-house, free
        parking.
      </p>
      {STATES.map((s) => (
        <a key={s} className={`b2-sv b2-sv--${s} b2-btn b2-btn--solid b2-abtn`} href={STATE_COPY[s].href}>
          Order pickup or delivery <span aria-hidden="true">→</span>
        </a>
      ))}
      <a className="b2-btn b2-btn--line b2-abtn" href={MENU_URL}>
        See the menu
      </a>
    </div>
  );
}

/** next/image filling its box; lazy. */
function Img({
  src,
  alt,
  sizes = '100vw',
  contain = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  contain?: boolean;
}) {
  return (
    <Image
      className={contain ? 'b2-photo b2-photo--contain' : 'b2-photo'}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading="lazy"
    />
  );
}

// -------------------------------------------------------------------- story
export function AppStory() {
  return (
    <section className="b2-as b2-story" data-pal="day" aria-labelledby="b2-story-t">
      <p className="b2-eyebrow b2-eyebrow--rule">Our story</p>
      <h2 className="b2-ah2" id="b2-story-t">
        Half a century, one Boulevard.
      </h2>
      <p className="b2-story__p b2-story__p--lead">
        <span className="b2-drop" aria-hidden="true">
          B
        </span>
        <span className="b2-sr">B</span>uccaneer opened on Astoria Boulevard in 1976. Fifty years later it is
        still a diner in the classic New York sense: big menu, bottomless coffee, and a kitchen
        that never closes.
      </p>
      <figure className="b2-story__fig">
        <div className="b2-story__ph">
          <Photo slot="S05a" sizes="(max-width: 719px) 80vw, 800px" />
        </div>
        <figcaption>The counter, Astoria Blvd.</figcaption>
      </figure>
      <p className="b2-story__p">
        Neighbors come in for breakfast. Mets fans come after the game. Travelers come straight from LaGuardia,
        just down the road, and taxi and truck drivers come at three in the morning. Everyone gets the same full
        menu, whatever the hour.
      </p>
      <p className="b2-story__p">
        We still bake our own cakes, pies, and cheesecake, and we still pick our own fish.{' '}
        <em>Some things are worth doing the long way.</em>
      </p>
      <dl className="b2-stats">
        <div>
          <dt>1976</dt>
          <dd>Opened on the Boulevard</dd>
        </div>
        <div>
          <dt>24/7</dt>
          <dd>Day and night</dd>
        </div>
        <div>
          <dt>400+</dt>
          <dd>Dishes on the menu</dd>
        </div>
        <div>
          <dt>
            4.3<small aria-hidden="true">★</small>
          </dt>
          <dd>3,500+ Google reviews</dd>
        </div>
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------- favorites
type Fav = (typeof FAVORITES)[number];

function Price({ v }: { v: string }) {
  return (
    <span className="b2-price">
      <sup>$</sup>
      {v}
    </span>
  );
}

function DishBig({ d, price }: { d: Fav; price: string }) {
  return (
    <article className="b2-dish b2-dish--big">
      <div className="b2-dish__ph">
        <Img src={d.img} alt={d.name} sizes="(max-width: 719px) 100vw, 492px" contain />
        {'tag' in d ? <span className="b2-dish__tag">{d.tag}</span> : null}
      </div>
      <div className="b2-dish__b">
        <div className="b2-dish__top">
          <h3 className="b2-dish__n b2-dish__n--big">{d.name}</h3>
          <Price v={price} />
        </div>
        <p className="b2-dish__d">{d.line}</p>
        <a className="b2-dish__o" href={item(d.id)} aria-label={`Order ${d.name}`}>
          Order <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

function DishSm({ d, price }: { d: Fav; price: string }) {
  return (
    <article className="b2-dish b2-dish--sm">
      <div className="b2-dish__ph">
        <Img src={d.img} alt={d.name} sizes="(max-width: 719px) 50vw, 300px" contain />
      </div>
      <h3 className="b2-dish__n">{d.name}</h3>
      <p className="b2-dish__d">{d.line}</p>
      <div className="b2-dish__foot">
        <Price v={price} />
        <a className="b2-dish__o" href={item(d.id)} aria-label={`Order ${d.name}`}>
          Order <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

export function AppFavorites({ prices, total }: { prices: FavoritePrices; total: number }) {
  const [a, b, c, d, e, f] = FAVORITES;
  const p = (x: Fav) => prices[x.id] ?? x.price;
  return (
    <section className="b2-as b2-fav" data-pal="sign" aria-labelledby="b2-fav-t">
      <p className="b2-eyebrow b2-eyebrow--rule">From the kitchen</p>
      <h2 className="b2-ah2" id="b2-fav-t">
        Where to start.
      </h2>
      <p className="b2-alede">Six plates that show what this kitchen does best.</p>
      <DishBig d={a} price={p(a)} />
      <div className="b2-fpair">
        <DishSm d={b} price={p(b)} />
        <DishSm d={c} price={p(c)} />
      </div>
      <DishBig d={d} price={p(d)} />
      <div className="b2-fpair">
        <DishSm d={e} price={p(e)} />
        <DishSm d={f} price={p(f)} />
      </div>
      <a className="b2-btn b2-btn--line b2-abtn b2-fav__all" href={MENU_URL}>
        See all {total} dishes <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

// --------------------------------------------------------- a day (4 scenes)
function Scene({
  n,
  hour,
  title,
  body,
  link,
  href,
  pal,
  side,
  children,
}: {
  n: number;
  hour: string;
  title: string;
  body: string;
  link: string;
  href: string;
  pal: 'day' | 'yolk' | 'sign';
  side: 'l' | 'r';
  children: ReactNode;
}) {
  return (
    <article className={`b2-scene b2-scene--${side}`} data-pal={pal}>
      <div className="b2-scene__ph">
        {children}
        <span className="b2-scene__h" aria-hidden="true">
          {hour}
        </span>
      </div>
      <div className="b2-scene__b">
        <span className="b2-scene__i" aria-hidden="true">
          0{n} / 04
        </span>
        <h3 className="b2-ah3">
          <span className="b2-sr">{hour}: </span>
          {title}
        </h3>
        <p>{body}</p>
        <a className="b2-alnk" href={href}>
          {link} <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

export function AppDays() {
  return (
    <section className="b2-as b2-days" data-pal="day" aria-labelledby="b2-days-t">
      <div className="b2-days__hd">
        <p className="b2-eyebrow b2-eyebrow--rule">Around the clock</p>
        <h2 className="b2-ah2" id="b2-days-t">
          A day at Buccaneer.
        </h2>
        <p className="b2-alede">Same booths, same counter. A different diner every few hours.</p>
      </div>
      <Scene
        n={1}
        hour="5 a.m."
        title="Sunrise, sunny side up."
        body="Three-egg omelettes, buttermilk pancakes, challah French toast, and hand-rolled bagels. Breakfast runs all day."
        link="Breakfast menu"
        href={LINKS.breakfast}
        pal="day"
        side="l"
      >
        <Photo slot="D02" file="/buccaneer/v2/app-scene-morning.webp" sizes={SCENE_WIDE} />
      </Scene>
      <Scene
        n={2}
        hour="11 a.m."
        title="Lunch hour, Queens style."
        body="Nine-ounce steak burgers, triple-decker clubs, a proper Reuben, and the soups of the day."
        link="Lunch menu"
        href={LINKS.lunch}
        pal="day"
        side="r"
      >
        {/* One burger per page: at midday the hero already shows it, so a counter place setting
            (S05b; on phones a booth, D05) takes its place. */}
        <div className="b2-sv b2-sv--morning b2-sv--evening b2-sv--night b2-fill">
          <Photo slot="D04" file="/buccaneer/v2/app-scene-lunch.webp" sizes={SCENE_TALL} />
        </div>
        <div className="b2-sv b2-sv--midday b2-fill b2-app-only">
          <Photo slot="D05" file={BOOTH_SCENE} sizes="(max-width: 719px) 85vw, 480px" />
        </div>
        <div className="b2-sv b2-sv--midday b2-fill b2-wide-only">
          <Photo slot="S05b" sizes="(max-width: 719px) 85vw, 480px" />
        </div>
      </Scene>
      <Scene
        n={3}
        hour="4 p.m."
        title="Sit down for dinner."
        body="Broiled seafood, Romanian steak, Greek plates, and pasta. Dinner plates come with soup or salad, potato, and vegetable."
        link="Dinner menu"
        href={LINKS.dinner}
        pal="yolk"
        side="l"
      >
        {/* In the evening the hero already shows the lobster: a different photo takes its place. */}
        <div className="b2-sv b2-sv--morning b2-sv--midday b2-sv--night b2-fill">
          <Photo
            slot="D06"
            file="/buccaneer/v2/app-scene-dinner.webp"
            position="50% 85%"
            sizes={SCENE_WIDE}
          />
        </div>
        <div className="b2-sv b2-sv--evening b2-fill b2-app-only">
          <Photo slot="D05" file={BOOTH_SCENE} sizes="(max-width: 719px) 85vw, 800px" />
        </div>
        <div className="b2-sv b2-sv--evening b2-fill b2-wide-only">
          <Photo slot="S05b" position="50% 60%" sizes={SCENE_WIDE} />
        </div>
      </Scene>
      <Scene
        n={4}
        hour="10 p.m."
        title="Still cooking at 3 a.m."
        body="The full menu runs all night. So does the cake case: cheesecake, carrot cake, and rice pudding, all baked here."
        link="Desserts"
        href={LINKS.desserts}
        pal="sign"
        side="r"
      >
        <Photo slot="S06" sizes={SCENE_LAST} />
      </Scene>
    </section>
  );
}

// ------------------------------------------------------------------ reviews
const STAR = 'M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z';

/** 4.3: four full stars and a third of the fifth. */
function Stars() {
  return (
    <svg className="b2-stars" viewBox="0 0 120 24" width="120" height="24" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="b2-star-part">
          <rect x="96" y="0" width="7" height="24" />
        </clipPath>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={`b${i}`} d={STAR} transform={`translate(${i * 24} 0)`} className="b2-stars__bg" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <path key={`o${i}`} d={STAR} transform={`translate(${i * 24} 0)`} className="b2-stars__on" />
      ))}
      <path d={STAR} transform="translate(96 0)" className="b2-stars__on" clipPath="url(#b2-star-part)" />
    </svg>
  );
}

export function AppReviews() {
  return (
    <section className="b2-as b2-rev" data-pal="day" aria-labelledby="b2-rev-t">
      <div className="b2-rev__score" aria-hidden="true">
        <span className="b2-rev__n">4.3</span>
        <div>
          <Stars />
          <p className="b2-rev__c">3,500+ Google reviews</p>
        </div>
      </div>
      <h2 className="b2-sr" id="b2-rev-t">
        4.3 stars from 3,500+ Google reviews.
      </h2>
      <figure className="b2-q b2-q--big">
        <span className="b2-q__m" aria-hidden="true">
          “
        </span>
        <blockquote>
          <p>We arrived from the airport at 3:38 AM and were pleasantly surprised to find a full menu available.</p>
        </blockquote>
        <figcaption>Ginger R. · Google</figcaption>
      </figure>
      <figure className="b2-q">
        <blockquote>
          <p>“A classic diner, with incredibly kind workers, very generous portions, and good prices.”</p>
        </blockquote>
        <figcaption>Google review</figcaption>
      </figure>
      <figure className="b2-q">
        <blockquote>
          <p>“…one of my top diners in Queens! Not only is the food delicious, there’s parking, drinks, great service.”</p>
        </blockquote>
        <figcaption>Krishana M. · Google</figcaption>
      </figure>
      <a className="b2-alnk" href={REVIEWS_URL} target="_blank" rel="noopener noreferrer">
        Read the reviews on Google <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

// ----------------------------------------------------------------- catering
export function AppCatering() {
  return (
    <section className="b2-as b2-acat" data-pal="yolk" aria-labelledby="b2-acat-t">
      <div className="b2-acat__ph">
        <Photo slot="S04" sizes="(max-width: 719px) 100vw, 700px" rawWide />
      </div>
      <div className="b2-acat__b">
        <p className="b2-eyebrow">Parties, offices &amp; gifts</p>
        <h2 className="b2-ah2" id="b2-acat-t">
          Feeding a crowd?
        </h2>
        <p className="b2-acat__p">
          Office lunches, birthdays, and family parties, from the same kitchen. Corporate accounts and gift
          certificates available.
        </p>
        <a className="b2-btn b2-btn--solid b2-abtn" href={PHONE_HREF}>
          Call about catering <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- visit
export function AppVisit() {
  return (
    <section className="b2-as b2-avisit" data-pal="sign" aria-labelledby="b2-avisit-t">
      {/* At night the hero is already the facade: no second one. */}
      <div className="b2-sv b2-sv--morning b2-sv--midday b2-sv--evening b2-avisit__ph">
        <Photo slot="S02" sizes="(max-width: 1023px) 100vw, 66vw" rawWide />
      </div>
      <div className="b2-avisit__b">
        <p className="b2-eyebrow b2-eyebrow--rule">Visit</p>
        <h2 className="b2-ah2" id="b2-avisit-t">
          {ADDRESS_1}.
        </h2>
        <p className="b2-avisit__sub">East Elmhurst, Queens · just down the road from LaGuardia</p>
        <dl className="b2-facts">
          <div>
            <dt>Hours</dt>
            <dd>Open 24 hours, 7 days a week</dd>
          </div>
          <div>
            <dt>Parking</dt>
            <dd>Free parking lot</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>Dine in, pick up, or get it delivered</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={PHONE_HREF}>{PHONE_TEXT}</a>
              <br />
              <a href={PHONE2_HREF}>{PHONE2_TEXT}</a>
            </dd>
          </div>
        </dl>
        <a
          className="b2-map b2-avisit__map"
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${ADDRESS_1} in Google Maps`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing to optimize */}
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
        <p className="b2-avisit__attr">© OpenStreetMap contributors</p>
        <div className="b2-avisit__btns">
          <a
            className="b2-btn b2-btn--solid b2-abtn"
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions <span aria-hidden="true">→</span>
          </a>
          <a className="b2-btn b2-btn--line b2-abtn" href={PHONE_HREF}>
            Call the diner
          </a>
        </div>
      </div>
    </section>
  );
}
