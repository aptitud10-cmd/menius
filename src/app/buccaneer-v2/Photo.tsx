import Image from 'next/image';
import { PHOTO_SLOTS, type SlotId } from './data';

/**
 * A photo slot. Fills its parent (the parent owns the aspect ratio and crop).
 *
 * src === null in PHOTO_SLOTS renders the designed placeholder: the block's ink
 * at 10% over its ground, a hairline hatch, a dashed subject-safe zone, and the
 * shot-list ID. Swapping in the real photo is a one-line change in data.ts.
 */
export default function Photo({
  slot,
  priority = false,
  sizes = '100vw',
  note,
}: {
  slot: SlotId;
  priority?: boolean;
  sizes?: string;
  /** Extra crop note appended to the placeholder label (e.g. "mobile: crop of the word"). */
  note?: string;
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
      />
    );
  }

  return (
    <div className="b2-ph" role="img" aria-label={`${s.label} — photo pending`} data-slot={slot}>
      <span className="b2-ph__zone" aria-hidden="true" />
      <span className="b2-ph__tag" aria-hidden="true">
        {s.label} — photo pending
        {note ? <span className="b2-ph__note">{note}</span> : null}
      </span>
    </div>
  );
}
