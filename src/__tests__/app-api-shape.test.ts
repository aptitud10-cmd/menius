/**
 * Unit tests for the /api/app/* shape helpers.
 *
 * WHAT: Covers the parsing rules behind the mobile app's Home and Pedidos tabs.
 * WHY:  Both screens read data the app can no longer fetch itself, so a silent
 *       parsing bug here shows up as a permanently empty list — the exact
 *       failure mode these endpoints were written to fix.
 *
 * RUN:  vitest run src/__tests__/app-api-shape.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  parseFavoriteRestaurantIds,
  keepActiveRestaurants,
  flattenOrderRestaurant,
  type FavoriteRestaurant,
} from '@/lib/app-api/shape';

const UUID_A = 'a1f5af6a-1805-49d2-b494-f074ac657357';
const UUID_B = '2245c790-1d42-4300-8bd9-e155d08f36a2';

function makeRestaurant(overrides?: Partial<FavoriteRestaurant>): FavoriteRestaurant {
  return {
    id: UUID_A,
    slug: 'buccaneer',
    name: 'Buccaneer Diner',
    logo_url: null,
    cover_image_url: null,
    description: null,
    is_active: true,
    ...overrides,
  };
}

describe('parseFavoriteRestaurantIds', () => {
  it('reads ids from the object shape the app writes', () => {
    expect(parseFavoriteRestaurantIds({ restaurants: [UUID_A, UUID_B], products: [] })).toEqual([
      UUID_A,
      UUID_B,
    ]);
  });

  it("returns none for the column's '[]' default", () => {
    // app_devices.favorites defaults to '[]'::jsonb — a bare array carries no
    // restaurant ids, and reading .restaurants off it must not throw.
    expect(parseFavoriteRestaurantIds([])).toEqual([]);
  });

  it('returns none for an array that happens to hold uuids', () => {
    expect(parseFavoriteRestaurantIds([UUID_A])).toEqual([]);
  });

  it('handles null, undefined and primitives', () => {
    expect(parseFavoriteRestaurantIds(null)).toEqual([]);
    expect(parseFavoriteRestaurantIds(undefined)).toEqual([]);
    expect(parseFavoriteRestaurantIds('nope')).toEqual([]);
    expect(parseFavoriteRestaurantIds(42)).toEqual([]);
  });

  it('returns none when restaurants is present but not an array', () => {
    expect(parseFavoriteRestaurantIds({ restaurants: 'nope' })).toEqual([]);
    expect(parseFavoriteRestaurantIds({ products: [UUID_A] })).toEqual([]);
  });

  it('drops malformed ids instead of failing the whole lookup', () => {
    // .in() on a uuid column rejects the entire query if one element can't
    // cast, so a single bad entry would otherwise empty the Home screen.
    expect(
      parseFavoriteRestaurantIds({ restaurants: [UUID_A, 'not-a-uuid', '', null, 7] }),
    ).toEqual([UUID_A]);
  });

  it('accepts uppercase uuids', () => {
    expect(parseFavoriteRestaurantIds({ restaurants: [UUID_A.toUpperCase()] })).toEqual([
      UUID_A.toUpperCase(),
    ]);
  });
});

describe('keepActiveRestaurants', () => {
  it('keeps active restaurants', () => {
    expect(keepActiveRestaurants([makeRestaurant({ is_active: true })])).toHaveLength(1);
  });

  it('drops deactivated ones', () => {
    expect(keepActiveRestaurants([makeRestaurant({ is_active: false })])).toEqual([]);
  });

  it('treats null as active so unset rows still show up', () => {
    expect(keepActiveRestaurants([makeRestaurant({ is_active: null })])).toHaveLength(1);
  });
});

describe('flattenOrderRestaurant', () => {
  it('flattens the object embed', () => {
    const row = {
      id: 'order-1',
      order_number: 'ORD-260818-001',
      restaurants: { name: 'Buccaneer Diner', slug: 'buccaneer' },
    };
    expect(flattenOrderRestaurant(row)).toEqual({
      id: 'order-1',
      order_number: 'ORD-260818-001',
      restaurant: { name: 'Buccaneer Diner', slug: 'buccaneer' },
    });
  });

  it('flattens the single-element array embed to the same shape', () => {
    const row = {
      id: 'order-1',
      restaurants: [{ name: 'Buccaneer Diner', slug: 'buccaneer' }],
    };
    expect(flattenOrderRestaurant(row).restaurant).toEqual({
      name: 'Buccaneer Diner',
      slug: 'buccaneer',
    });
  });

  it('yields a null restaurant when the embed is null, missing or empty', () => {
    expect(flattenOrderRestaurant({ id: 'o', restaurants: null }).restaurant).toBeNull();
    expect(flattenOrderRestaurant({ id: 'o' }).restaurant).toBeNull();
    expect(flattenOrderRestaurant({ id: 'o', restaurants: [] }).restaurant).toBeNull();
  });

  it('never leaks the raw embed key to the app', () => {
    const out = flattenOrderRestaurant({
      id: 'o',
      restaurants: { name: 'X', slug: 'x' },
    });
    expect(out).not.toHaveProperty('restaurants');
  });

  it('preserves the other order columns untouched', () => {
    const out = flattenOrderRestaurant({
      id: 'order-1',
      order_number: 'ORD-260818-001',
      status: 'delivered',
      total: '16.04',
      created_at: '2026-08-18T09:29:23.438307+00:00',
      restaurant_id: UUID_A,
      restaurants: { name: 'Buccaneer Diner', slug: 'buccaneer' },
    });
    expect(out).toMatchObject({
      id: 'order-1',
      order_number: 'ORD-260818-001',
      status: 'delivered',
      total: '16.04',
      restaurant_id: UUID_A,
    });
  });
});
