import { describe, it, expect } from 'vitest';
import {
  hasRealPopularity,
  showsPopularityBadge,
  POPULAR_MIN_ORDERS_7D,
  POPULAR_MAX_BADGES,
} from '@/lib/social-proof';

describe('social proof minimums', () => {
  it('ignores a ranking built on a handful of orders (test orders)', () => {
    // Buccaneer 2026-11-16: #1 this week came from 11 test orders.
    expect(showsPopularityBadge({ popularity_rank: 1, orders_last_7d: 11 })).toBe(false);
    expect(hasRealPopularity({ popularity_rank: 1, orders_last_7d: 11 })).toBe(false);
  });

  it('shows the badge once the product has real volume', () => {
    expect(showsPopularityBadge({ popularity_rank: 1, orders_last_7d: POPULAR_MIN_ORDERS_7D })).toBe(true);
  });

  it('never badges more than the top N', () => {
    expect(showsPopularityBadge({ popularity_rank: POPULAR_MAX_BADGES, orders_last_7d: 50 })).toBe(true);
    expect(showsPopularityBadge({ popularity_rank: POPULAR_MAX_BADGES + 1, orders_last_7d: 50 })).toBe(false);
  });

  it('handles products the cron never ranked', () => {
    expect(showsPopularityBadge({})).toBe(false);
    expect(showsPopularityBadge({ popularity_rank: null, orders_last_7d: null })).toBe(false);
  });
});
