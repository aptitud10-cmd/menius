import Image from 'next/image';
import { PHOTO_SLOTS, type SlotId } from './data';

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
}: {
  slot: SlotId;
  priority?: boolean;
  sizes?: string;
}) {
  const s = PHOTO_SLOTS[slot];

  if (s.src) {
    return (
      <Image
        className="b2-photo"
        src={s.src}
        alt={s.alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        style={s.position ? { objectPosition: s.position } : undefined}
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
