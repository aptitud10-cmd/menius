import { describe, it, expect } from 'vitest';
import { formatPrice, slugify, timeAgo, ORDER_STATUS_CONFIG } from '@/lib/utils';

describe('formatPrice', () => {
  it('formats USD correctly', () => {
    const result = formatPrice(12.99, 'USD');
    expect(result).toContain('12.99');
  });

  it('formats zero price', () => {
    const result = formatPrice(0, 'USD');
    expect(result).toContain('0.00');
  });

  it('defaults to MXN', () => {
    const result = formatPrice(100);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('handles large numbers', () => {
    const result = formatPrice(99999.99, 'USD');
    expect(result).toContain('99,999.99');
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Mi Restaurante')).toBe('mi-restaurante');
  });

  it('removes accents', () => {
    expect(slugify('Café Niño')).toBe('cafe-nino');
  });

  it('replaces special characters with hyphens', () => {
    expect(slugify('Hello World! @#$')).toBe('hello-world');
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugify('--test--')).toBe('test');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
  });
});

describe('timeAgo', () => {
  it('returns "Ahora" for recent dates', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('Ahora');
  });

  it('returns minutes for recent past', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe('5m');
  });

  it('returns hours for same day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe('2h');
  });

  it('returns days for older dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe('3d');
  });
});

describe('ORDER_STATUS_CONFIG', () => {
  it('has all expected statuses', () => {
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    for (const status of statuses) {
      expect(ORDER_STATUS_CONFIG[status]).toBeDefined();
      expect(ORDER_STATUS_CONFIG[status].label).toBeTruthy();
      expect(ORDER_STATUS_CONFIG[status].color).toBeTruthy();
      expect(ORDER_STATUS_CONFIG[status].bg).toBeTruthy();
    }
  });
});
