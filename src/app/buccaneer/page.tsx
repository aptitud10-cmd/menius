import Image from 'next/image';
import LiveStatus from './LiveStatus';
import './buccaneer.css';

const MENU_URL = 'https://menius.app/buccaneer';
const DIRECTIONS_URL =
  'https://maps.google.com/?q=9301+Astoria+Blvd,+East+Elmhurst,+NY+11369';

export default function BuccaneerLanding() {
  return (
    <main className="bd-main">
      <header className="bd-header">
        <span className="bd-wordmark">Buccaneer</span>
        <span className="bd-header__badge">Open 24h</span>
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
            9301 Astoria Blvd
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

      {/* Four facts. Every number here is verifiable: 24 hours and the phone come
          from the restaurant record, 408 is the live count of active products.
          The founding year the art direction asked for is deliberately absent —
          it is not confirmed, and an invented year on a 50-year-old diner is the
          kind of detail a regular would catch. */}
      <section className="bd-facts" aria-label="At a glance">
        <div className="bd-fact">
          <span className="bd-fact__num">24</span>
          <span className="bd-fact__label">Hours a day</span>
        </div>
        <div className="bd-fact">
          <span className="bd-fact__num">408</span>
          <span className="bd-fact__label">Dishes</span>
        </div>
        <div className="bd-fact">
          <span className="bd-fact__num">7</span>
          <span className="bd-fact__label">Days a week</span>
        </div>
        <div className="bd-fact">
          <span className="bd-fact__num bd-fact__num--word">Queens</span>
          <span className="bd-fact__label">Astoria Blvd</span>
        </div>
      </section>
    </main>
  );
}
