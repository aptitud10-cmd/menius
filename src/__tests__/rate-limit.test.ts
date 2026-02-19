import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('allows first request', () => {
    const key = `test-${Date.now()}-1`;
    const result = checkRateLimit(key, { limit: 5, windowSec: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks after exceeding limit', () => {
    const key = `test-${Date.now()}-2`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { limit: 3, windowSec: 60 });
    }
    const result = checkRateLimit(key, { limit: 3, windowSec: 60 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = `test-${Date.now()}-3`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { limit: 3, windowSec: 1 });
    }
    const blocked = checkRateLimit(key, { limit: 3, windowSec: 1 });
    expect(blocked.allowed).toBe(false);

    await new Promise(r => setTimeout(r, 1100));
    const afterReset = checkRateLimit(key, { limit: 3, windowSec: 1 });
    expect(afterReset.allowed).toBe(true);
  });

  it('tracks remaining correctly', () => {
    const key = `test-${Date.now()}-4`;
    const r1 = checkRateLimit(key, { limit: 5, windowSec: 60 });
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimit(key, { limit: 5, windowSec: 60 });
    expect(r2.remaining).toBe(3);
  });
});

describe('getClientIP', () => {
  it('returns x-forwarded-for first IP', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('returns x-real-ip as fallback', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('returns localhost as default', () => {
    const req = new Request('http://localhost');
    expect(getClientIP(req)).toBe('127.0.0.1');
  });
});
