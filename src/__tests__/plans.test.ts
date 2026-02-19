import { describe, it, expect } from 'vitest';
import { getPlan, isWithinLimit, PLANS, TRIAL_DAYS } from '@/lib/plans';

describe('getPlan', () => {
  it('resolves starter plan directly', () => {
    const plan = getPlan('starter');
    expect(plan).toBeDefined();
    expect(plan!.id).toBe('starter');
    expect(plan!.name).toBe('Starter');
  });

  it('resolves "basic" alias to starter', () => {
    const plan = getPlan('basic');
    expect(plan).toBeDefined();
    expect(plan!.id).toBe('starter');
  });

  it('resolves "enterprise" alias to business', () => {
    const plan = getPlan('enterprise');
    expect(plan).toBeDefined();
    expect(plan!.id).toBe('business');
  });

  it('resolves pro plan', () => {
    const plan = getPlan('pro');
    expect(plan).toBeDefined();
    expect(plan!.id).toBe('pro');
    expect(plan!.popular).toBe(true);
  });

  it('returns null for unknown plan', () => {
    expect(getPlan('nonexistent')).toBeNull();
  });
});

describe('isWithinLimit', () => {
  it('returns true when under limit', () => {
    expect(isWithinLimit(5, 10)).toBe(true);
  });

  it('returns true at exactly the limit', () => {
    expect(isWithinLimit(10, 10)).toBe(true);
  });

  it('returns false when over limit', () => {
    expect(isWithinLimit(11, 10)).toBe(false);
  });

  it('returns true for unlimited (-1)', () => {
    expect(isWithinLimit(999999, -1)).toBe(true);
  });
});

describe('PLANS structure', () => {
  it('has three plans', () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
  });

  it('all plans have required fields', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.id).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(plan.price.monthly).toBeGreaterThan(0);
      expect(plan.price.annual).toBeGreaterThan(0);
      expect(plan.limits.maxProducts).toBeDefined();
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('annual price is cheaper per month than monthly', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.price.annual / 12).toBeLessThan(plan.price.monthly);
    }
  });

  it('business plan has unlimited products', () => {
    expect(PLANS.business.limits.maxProducts).toBe(-1);
  });
});

describe('TRIAL_DAYS', () => {
  it('is 14 days', () => {
    expect(TRIAL_DAYS).toBe(14);
  });
});
