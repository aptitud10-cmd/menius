import type { CSSProperties } from 'react';
import Image, { getImageProps } from 'next/image';
import { APP_MQ, PHOTO_SLOTS, type SlotId } from './data';

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
}: {
  slot: SlotId;
  priority?: boolean;
  sizes?: string;
  /** Another file for this slot's alt text (app layout crops); ignores the slot's own framing. */
  file?: string;
  position?: string;
}) {
  const s = PHOTO_SLOTS[slot];

  if (s.src && file) {
    return (
      <Image
        className="b2-photo"
        src={file}
        alt={s.alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        style={position ? ({ '--op': position } as CSSProperties) : undefined}
      />
    );
  }

  if (s.src) {
    // Framing via custom properties so phones can use their own (see .b2-photo).
    const framing = {
      ...(s.position ? { '--op': s.position } : {}),
      ...(s.mobilePosition ? { '--op-m': s.mobilePosition } : {}),
    } as CSSProperties;

    if (s.mobileSrc || s.appSrc) {
      // Art direction: portrait phones (app layout) and phones get their own crops, everything else the full frame.
      const common = { alt: s.alt, fill: true, sizes, priority, loading: priority ? undefined : ('lazy' as const) };
      const app = s.appSrc ? getImageProps({ ...common, src: s.appSrc }).props : null;
      const phone = s.mobileSrc ? getImageProps({ ...common, src: s.mobileSrc }).props : null;
      const { props: wide } = getImageProps({ ...common, src: s.src });
      return (
        <picture>
          {app ? <source media={APP_MQ} srcSet={app.srcSet} sizes={app.sizes} /> : null}
          {phone ? <source media={PHONE_MQ} srcSet={phone.srcSet} sizes={phone.sizes} /> : null}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes in the spread props */}
          <img
            {...wide}
            className={s.mobileSrc ? 'b2-photo b2-photo--ad' : 'b2-photo'}
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
