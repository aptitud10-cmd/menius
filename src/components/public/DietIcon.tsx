import { Beef, Flame, Leaf, MilkOff, Nut, Sprout, WheatOff, BadgeCheck, Salad } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Line icons for the dietary filters. The emojis rendered in each platform's
 * colors (purple, blue…) and off the menu's visual system.
 */
const ICONS: Record<string, LucideIcon> = {
  vegetarian: Salad,
  vegan: Leaf,
  gluten_free: WheatOff,
  dairy_free: MilkOff,
  spicy: Flame,
  contains_nuts: Nut,
  keto: Beef,
  organic: Sprout,
  halal: BadgeCheck,
  kosher: BadgeCheck,
};

export function DietIcon({ tag, className }: { tag: string; className?: string }) {
  const Icon = ICONS[tag] ?? Leaf;
  return <Icon className={className} aria-hidden="true" />;
}
