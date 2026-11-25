import type { CSSProperties } from 'react';
import Image, { getImageProps } from 'next/image';
import { APP_MQ, PHOTO_SLOTS, TAB_STACK_MQ, type SlotId } from './data';

/** Same query as the phone layout in buccaneer-v2.css (portrait <= 719, phones in landscape). */
const PHONE_MQ = '(max-width: 719px), (max-width: 1279px) and (max-height: 500px)';

/**
 * A photo slot. Fills its parent (the parent owns the aspect ratio and crop).
 *
 * src === null in PHOTO_SLOTS renders the designed placeholder: the block's ink
 * at 10% over its ground, a hairline hatch and a dashed subject-safe zone. It
 * carries no visible text (the public sees this page): the shot-list ID stays in
 * `data-slot` and in data.ts. Swapping in the real photo is a one-line change in
 * data.ts.
 */
export default function Photo({
  slot,
  priority = false,
  sizes = '100vw',
  file,
  position,
  rawWide = false,
}: {
  slot: SlotId;
  priority?: boolean;
  sizes?: string;
  /** A crop of this slot for the portrait-phone app layout only (APP_MQ); tablet and desktop use the slot's own file. */
  file?: string;
  /** object-position for the slot's own file (tablet, desktop); overrides the slot's. */
  position?: string;
  /**
   * Tablet and desktop get the static file as is (unoptimized); phones keep the optimized candidates.
   * For big sources (2400px) the optimizer tops out at 1920px, short of 2x on wide boxes, and we do
   * not raise images.deviceSizes (Image Transformations quota).
   */
  rawWide?: boolean;
}) {
  const s = PHOTO_SLOTS[slot];

  if (s.src) {
    // Framing via custom properties so phones can use their own (see .b2-photo).
    const pos = position ?? s.position;
    const framing = {
      ...(pos ? { '--op': pos } : {}),
      ...(s.mobilePosition && !position ? { '--op-m': s.mobilePosition } : {}),
    } as CSSProperties;

    // The app crop: an explicit `file` wins over the slot's `appSrc`; with a `file` the
    // slot's own phone crop does not apply (that crop belongs to the hero/landscape layouts).
    const app = file ?? s.appSrc;
    const phone = file ? undefined : s.mobileSrc;
    const tab = file ? undefined : s.tabSrc;

    if (rawWide) {
      const common = { alt: s.alt, fill: true, sizes, priority, loading: priority ? undefined : ('lazy' as const) };
      const opt = getImageProps({ ...common, src: s.src }).props;
      const { props: raw } = getImageProps({ ...common, src: s.src, unoptimized: true });
      return (
        <picture>
          <source media="(max-width: 719px)" srcSet={opt.srcSet} sizes={opt.sizes} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes in the spread props */}
          <img {...raw} className="b2-photo" style={{ ...raw.style, ...framing }} />
        </picture>
      );
    }

    if (app || phone || tab) {
      // Art direction: portrait phones (app layout) and phones get their own crops, the stacked
      // tablet hero a horizontal frame, everything else the full frame. The queries are disjoint.
      const common = { alt: s.alt, fill: true, sizes, priority, loading: priority ? undefined : ('lazy' as const) };
      const appP = app ? getImageProps({ ...common, src: app }).props : null;
      const phoneP = phone ? getImageProps({ ...common, src: phone }).props : null;
      const tabP = tab ? getImageProps({ ...common, src: tab }).props : null;
      const { props: wide } = getImageProps({ ...common, src: s.src });
      return (
        <picture>
          {tabP ? <source media={TAB_STACK_MQ} srcSet={tabP.srcSet} sizes={tabP.sizes} /> : null}
          {appP ? <source media={APP_MQ} srcSet={appP.srcSet} sizes={appP.sizes} /> : null}
          {phoneP ? <source media={PHONE_MQ} srcSet={phoneP.srcSet} sizes={phoneP.sizes} /> : null}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes in the spread props */}
          <img
            {...wide}
            className={phone || file ? 'b2-photo b2-photo--ad' : 'b2-photo'}
            style={{ ...wide.style, ...framing }}
          />
        </picture>
      );
    }

    return (
      <Image
        className="b2-photo"
        src={s.src}
        alt={s.alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        style={framing}
      />
    );
  }

  return (
    <div className="b2-ph" role="img" aria-label={s.alt} data-slot={slot}>
      <span className="b2-ph__zone" aria-hidden="true" />
    </div>
  );
}

/** True when the slot has a real photo. Captions only show under real photos. */
export function hasPhoto(slot: SlotId): boolean {
  return PHOTO_SLOTS[slot].src !== null;
}
