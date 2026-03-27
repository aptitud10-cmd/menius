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
  it('has four plans (free, starter, pro, business)', () => {
    expect(Object.keys(PLANS)).toHaveLength(4);
    expect(PLANS.free).toBeDefined();
    expect(PLANS.starter).toBeDefined();
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.business).toBeDefined();
  });

  it('all plans have required fields', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.id).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(plan.price.monthly).toBeGreaterThanOrEqual(0);
      expect(plan.price.annual).toBeGreaterThanOrEqual(0);
      expect(plan.limits.maxProducts).toBeDefined();
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('free plan has $0 price', () => {
    expect(PLANS.free.price.monthly).toBe(0);
    expect(PLANS.free.price.annual).toBe(0);
    expect(PLANS.free.isFree).toBe(true);
  });

  it('paid plans have positive price', () => {
    expect(PLANS.starter.price.monthly).toBeGreaterThan(0);
    expect(PLANS.pro.price.monthly).toBeGreaterThan(0);
    expect(PLANS.business.price.monthly).toBeGreaterThan(0);
  });

  it('annual price is cheaper per month than monthly (paid plans)', () => {
    for (const plan of Object.values(PLANS)) {
      if (plan.isFree) continue;
      expect(plan.price.annual / 12).toBeLessThan(plan.price.monthly);
    }
  });

  it('free plan limits are correct', () => {
    expect(PLANS.free.limits.maxTables).toBe(5);
    expect(PLANS.free.limits.maxUsers).toBe(1);
    expect(PLANS.free.limits.maxOrdersPerMonth).toBe(50);
    expect(PLANS.free.limits.maxProducts).toBe(-1);
  });

  it('starter plan limits are correct', () => {
    expect(PLANS.starter.limits.maxTables).toBe(15);
    expect(PLANS.starter.limits.maxUsers).toBe(2);
    expect(PLANS.starter.limits.maxProducts).toBe(-1);
    expect(PLANS.starter.limits.maxCategories).toBe(-1);
  });

  it('pro plan limits are correct', () => {
    expect(PLANS.pro.limits.maxTables).toBe(50);
    expect(PLANS.pro.limits.maxUsers).toBe(5);
    expect(PLANS.pro.limits.maxProducts).toBe(-1);
  });

  it('business plan has fully unlimited limits', () => {
    expect(PLANS.business.limits.maxProducts).toBe(-1);
    expect(PLANS.business.limits.maxTables).toBe(-1);
    expect(PLANS.business.limits.maxUsers).toBe(-1);
    expect(PLANS.business.limits.maxCategories).toBe(-1);
  });

  it('pro plan is marked as popular', () => {
    expect(PLANS.pro.popular).toBe(true);
    expect(PLANS.starter.popular).toBeFalsy();
    expect(PLANS.business.popular).toBeFalsy();
  });
});

describe('TRIAL_DAYS', () => {
  it('is 14 days', () => {
    expect(TRIAL_DAYS).toBe(14);
  });
});
