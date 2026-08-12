import Image from 'next/image';
import LiveStatus from './LiveStatus';
import './buccaneer.css';

const MENU_URL = 'https://menius.app/buccaneer';
const DIRECTIONS_URL =
  'https://maps.google.com/?q=9301+Astoria+Blvd,+East+Elmhurst,+NY+11369';

const CDN =
  'https://hdlhmqvbaxzhmhtablwt.supabase.co/storage/v1/object/public/product-images/ai/a1f5af6a-1805-49d2-b494-f074ac657357';

/**
 * Three dishes at three hours. The timestamps are the device: the same diner at
 * 4am, at midnight, at the end of the evening — which is the whole argument for
 * a place that never closes.
 *
 * These are the live menu photographs, not decoration: each one links to the dish
 * a visitor can actually order right now.
 */
const NIGHT = [
  {
    time: '04:12',
    name: 'French fries',
    caption: 'The shift at LaGuardia ends and this is breakfast.',
    src: `${CDN}/french-fries-1786531919620.jpg`,
    href: `${MENU_URL}?category=Side%20Orders`,
  },
  {
    time: '01:30',
    name: 'Buffalo wings',
    caption: 'Nobody else on Astoria Blvd is cooking.',
    src: `${CDN}/buffalo-wings-1786537907822.jpg`,
    href: `${MENU_URL}?category=Appetizers`,
  },
  {
    time: '23:45',
    name: 'Apple pie, from the case',
    caption: 'Last flight in, last slice out.',
    src: `${CDN}/apple-pie-1786541671815.jpg`,
    href: `${MENU_URL}?category=Desserts`,
  },
];

/**
 * The menu, grouped by hour rather than by course.
 *
 * The database has 48 categories — a tile per category is unreadable, and the
 * six-tile bento the template playbook calls for would misrepresent a menu this
 * size. Grouping by when you'd eat it does two things at once: it keeps the
 * count honest (every number below is the sum of live products in that group)
 * and it restates the argument of the page, which is that the hour is the
 * subject.
 *
 * `span` drives the tile size, and it is not decorative: the groups a diner
 * actually sells get the big tiles. Breakfast at a 24-hour diner is the
 * business, so it is the one that runs full width.
 *
 * `photo` is present only where the group has a real generated photograph.
 * Breakfast and Burgers are still on shared stock, so those two tiles carry an
 * index of the categories inside them instead — a genuinely useful list that
 * tells a visitor whether what they want is on the menu, and a better answer
 * than either an empty rectangle or a stock image four other diners also use.
 */
const GROUPS = [
  {
    hours: '24 hours',
    name: 'Breakfast',
    blurb: 'Served at any hour — that is the whole point.',
    count: 60,
    href: `${MENU_URL}?category=Buttermilk%20Pancakes`,
    span: 'wide' as const,
    photo: null,
    index: [
      'Buttermilk Pancakes',
      'Belgian Waffles',
      'French Toast',
      '3 Egg Specialty Omelettes',
      'The Benedict',
      'Farm Fresh Eggs',
      'Hand Rolled Water Bagels',
      'The Bake Shop',
      'Greek Yogurt',
      'Juices',
    ],
  },
  {
    hours: 'From the grill',
    name: 'Burgers',
    blurb: 'Certified Angus beef.',
    count: 19,
    href: `${MENU_URL}?category=7%20oz.%20Certified%20Angus%20Beef%20Burgers`,
    span: 'tall' as const,
    photo: null,
    index: ['7 oz. Certified Angus', '9 oz. Specialty Steak'],
  },
  {
    hours: 'All day',
    name: 'Appetizers',
    blurb: 'Wings, quesadillas, disco fries.',
    count: 21,
    href: `${MENU_URL}?category=Appetizers`,
    span: 'small' as const,
    photo: `${CDN}/mozzarella-sticks-1786537907822.jpg`,
    index: null,
  },
  {
    hours: 'All day',
    name: 'Sides',
    blurb: 'Waffle fries, tostones, onion rings.',
    count: 24,
    href: `${MENU_URL}?category=Side%20Orders`,
    span: 'small' as const,
    photo: `${CDN}/waffle-fries-1786531919620.jpg`,
    index: null,
  },
  {
    hours: 'Dinner',
    name: 'Seafood',
    blurb: 'Broiled, fried, stuffed. Lobster tails every night.',
    count: 20,
    href: `${MENU_URL}?category=Seafood`,
    span: 'small' as const,
    photo: `${CDN}/lobster-tails-1786533460195.jpg`,
    index: null,
  },
  {
    hours: 'The case is always full',
    name: 'The Bake Shop',
    blurb: 'Cheesecake, pies, layer cakes. Cut to order at 3am like it is noon.',
    count: 27,
    href: `${MENU_URL}?category=Desserts`,
    span: 'wide' as const,
    photo: `${CDN}/plain-cheesecake-1786541671815.jpg`,
    index: null,
  },
];

export default function BuccaneerLanding() {
  return (
    <main className="bd-main">
      <header className="bd-header">
        <span className="bd-wordmark">Buccaneer</span>
        {/* The badge used to be inert text. On a page whose whole job is to send
            people to the menu, the one persistent element on screen should be
            able to take them there. */}
        <a className="bd-header__order" href={MENU_URL}>
          Order
        </a>
      </header>

      <section className="bd-hero">
        {/* Ambience, not subject: the facade sits under a heavy scrim so the
            headline stays the brightest thing on screen. Marked TEMP because it
            is stock — the real facade at night replaces this file, not this code. */}
        <div className="bd-hero__media">
          <Image
            src="/buccaneer/temp/TEMP-facade-night.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="bd-hero__img"
          />
          <div className="bd-hero__scrim" />
        </div>

        <div className="bd-hero__body">
          <p className="bd-eyebrow">East Elmhurst, Queens</p>

          <h1 className="bd-h1">
            Always open.
            <br />
            <span className="bd-h1__lit">Always been here.</span>
          </h1>

          <p className="bd-lead">
            Breakfast at 4am, burgers at midnight. Astoria Boulevard’s diner,
            open 24 hours a day.
          </p>

          <LiveStatus />

          <p className="bd-address">
            9301 Astoria Boulevard
            <span className="bd-address__sep" aria-hidden="true">·</span>
            <a href="tel:+17184295188" className="bd-address__tel">
              (718) 429-5188
            </a>
          </p>

          <div className="bd-cta">
            <a className="bd-btn bd-btn--solid" href={MENU_URL}>
              Order online
              <span aria-hidden="true"> →</span>
            </a>
            <a
              className="bd-btn bd-btn--ghost"
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions
            </a>
          </div>
        </div>
      </section>

      {/* Not a row of centred counters — that is the template tell, and two of
          the four numbers it wanted were filler ("7 days a week" merely repeats
          "24 hours"; "Queens" is a label, not a fact).

          What replaces it is one sentence with the numbers set inside it, so
          they read as claims rather than badges. Every figure is verifiable: 24
          from the restaurant record, 408 the live count of active products, 0
          the number of hours it is shut. The founding year the art direction
          asked for stays out — it is not confirmed, and an invented year on a
          diner this old is exactly what a regular would catch. */}
      <section className="bd-claim" aria-label="At a glance">
        <p className="bd-claim__text">
          <span className="bd-claim__n">408</span> dishes, served across{' '}
          <span className="bd-claim__n">24</span> hours, closed{' '}
          <span className="bd-claim__n">0</span> days a year.
        </p>
        {/* The cross-street belongs to the room section, which states it in
            full. Here the useful thing is the other half of the brief — that
            you can eat in, take it away, or have it brought. */}
        <p className="bd-claim__foot">
          Dine in · Pickup · Delivery
        </p>
      </section>

      {/* The signature section — the one no competitor can copy, because none of
          them are open. The generated dish photos do their best work here: on a
          black ground, lit from one side, they are legitimately what they are —
          product compositions in the dark — and never pretend to be documentary. */}
      <section className="bd-night" aria-labelledby="bd-night-title">
        <div className="bd-night__head">
          <h2 id="bd-night-title" className="bd-h2">
            It’s 3am and
            <br />
            we’re cooking.
          </h2>
          <p className="bd-night__note">
            The shift that ends at four. The flight that lands at one. The people
            who keep Queens running eat somewhere — this is that somewhere.
          </p>
        </div>

        <ol className="bd-night__list">
          {NIGHT.map((dish) => (
            <li key={dish.time} className="bd-night__item">
              <a className="bd-night__link" href={dish.href}>
                <span className="bd-night__frame">
                  <Image
                    src={dish.src}
                    alt={dish.name}
                    width={900}
                    height={900}
                    sizes="(min-width: 1024px) 38vw, 82vw"
                    className="bd-night__img"
                  />
                </span>
                <span className="bd-night__meta">
                  <span className="bd-night__time">{dish.time}</span>
                  <span className="bd-night__name">{dish.name}</span>
                  <span className="bd-night__caption">{dish.caption}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>

        {/* Required by the art direction, and by plain honesty: 2026 has a
            documented consumer backlash against restaurants passing AI images off
            as photographs. Saying what they are costs nothing and is the whole
            difference between a styled catalogue and a lie. */}
        <p className="bd-disclosure">
          Dish images are styled product compositions.
        </p>
      </section>

      {/* The bridge to the menu. Every tile is a real deep link into the live
          catalogue on menius.app — this section exists to send people there,
          not to describe the food a second time. */}
      <section className="bd-menu" aria-labelledby="bd-menu-title">
        <div className="bd-menu__head">
          <p className="bd-eyebrow">The menu</p>
          <h2 id="bd-menu-title" className="bd-h2">
            408 dishes.
            <br />
            No closing time.
          </h2>
        </div>

        <ul className="bd-menu__grid">
          {GROUPS.map((g) => (
            <li key={g.name} className={`bd-tile bd-tile--${g.span}`}>
              <a className="bd-tile__link" href={g.href}>
                {g.photo && (
                  <span className="bd-tile__media" aria-hidden="true">
                    <Image
                      src={g.photo}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="bd-tile__img"
                    />
                  </span>
                )}
                <span className="bd-tile__body">
                  <span className="bd-tile__hours">{g.hours}</span>
                  <span className="bd-tile__name">{g.name}</span>
                  <span className="bd-tile__blurb">{g.blurb}</span>
                  {g.index && (
                    <span className="bd-tile__index">
                      {g.index.map((c) => (
                        <span key={c} className="bd-tile__indexItem">
                          {c}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="bd-tile__count">
                    {g.count} <span className="bd-tile__countWord">dishes</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="bd-menu__foot">
          <a className="bd-btn bd-btn--solid" href={MENU_URL}>
            See the full menu
            <span aria-hidden="true"> →</span>
          </a>
        </div>
      </section>

      {/* The other half of the brief: this page has to bring people through the
          door as much as it takes orders. What that needs is a picture of the
          room, and the room has not been photographed yet — so the section is
          built around the facts that are already true (where it is, how close
          the airport is, that all three service types are on) and the image
          slot is left honestly empty rather than filled with a stock interior
          of a diner that is not this one. */}
      <section className="bd-place" aria-labelledby="bd-place-title">
        <div className="bd-place__copy">
          <p className="bd-eyebrow">The room</p>
          <h2 id="bd-place-title" className="bd-h2">
            Astoria Blvd
            <br />
            &amp; 93rd.
          </h2>
          <p className="bd-place__lead">
            Three minutes off the Grand Central, five from the LaGuardia
            terminals. Booths, a counter, and coffee that keeps coming.
          </p>

          <dl className="bd-place__facts">
            <div className="bd-place__fact">
              <dt>Address</dt>
              <dd>
                9301 Astoria Boulevard
                <br />
                East Elmhurst, NY 11369
              </dd>
            </div>
            <div className="bd-place__fact">
              <dt>Hours</dt>
              <dd>Every day, all day. No closing time.</dd>
            </div>
            <div className="bd-place__fact">
              <dt>Phone</dt>
              <dd>
                <a href="tel:+17184295188">(718) 429-5188</a>
              </dd>
            </div>
            <div className="bd-place__fact">
              <dt>Service</dt>
              <dd>Dine in · Pickup · Delivery</dd>
            </div>
          </dl>

          <div className="bd-cta bd-place__cta">
            <a
              className="bd-btn bd-btn--solid"
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions
              <span aria-hidden="true"> →</span>
            </a>
            <a className="bd-btn bd-btn--ghost" href="tel:+17184295188">
              Call the diner
            </a>
          </div>
        </div>

        {/* Deliberately not a stock interior. An empty amber-ruled frame that
            says a photograph is coming is honest; a photo of somebody else's
            diner presented as this room is the exact thing the research warned
            about. Replaced by the real interior shot, not by more code. */}
        <div className="bd-place__slot" role="img" aria-label="A photograph of the dining room is coming soon">
          <span className="bd-place__slotMark" aria-hidden="true">
            9301
          </span>
          <span className="bd-place__slotNote">
            Photograph of the room — coming
          </span>
        </div>
      </section>

      <footer className="bd-footer">
        <div className="bd-footer__top">
          <span className="bd-wordmark bd-footer__mark">Buccaneer</span>
          <p className="bd-footer__tag">
            Open 24 hours, every day of the year.
          </p>
        </div>

        <div className="bd-footer__cols">
          <div className="bd-footer__col">
            <h3 className="bd-footer__h">Find us</h3>
            <p>
              9301 Astoria Boulevard
              <br />
              East Elmhurst, NY 11369
            </p>
            <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
              Open in Maps
            </a>
          </div>

          <div className="bd-footer__col">
            <h3 className="bd-footer__h">Order</h3>
            <a href={MENU_URL}>Full menu</a>
            <a href={`${MENU_URL}?category=Buttermilk%20Pancakes`}>Breakfast</a>
            <a href={`${MENU_URL}?category=Desserts`}>The Bake Shop</a>
          </div>

          <div className="bd-footer__col">
            <h3 className="bd-footer__h">Call</h3>
            <a href="tel:+17184295188">(718) 429-5188</a>
            <p className="bd-footer__quiet">Dine in · Pickup · Delivery</p>
          </div>
        </div>

        <div className="bd-footer__base">
          <p>© {new Date().getFullYear()} Buccaneer Diner</p>
          {/* The disclosure repeats here because a visitor who lands mid-page
              and scrolls to the footer never passed the night section. */}
          <p className="bd-footer__quiet">
            Dish images are styled product compositions.
          </p>
        </div>
      </footer>
    </main>
  );
}
