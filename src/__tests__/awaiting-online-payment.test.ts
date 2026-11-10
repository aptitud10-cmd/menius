import { describe, it, expect } from 'vitest';
import { isAwaitingOnlinePayment } from '@/lib/order-state';

describe('isAwaitingOnlinePayment', () => {
  it('hides unpaid online and wallet orders while pending', () => {
    expect(isAwaitingOnlinePayment({ payment_method: 'online', payment_status: 'pending', status: 'pending' })).toBe(true);
    expect(isAwaitingOnlinePayment({ payment_method: 'wallet', payment_status: null, status: 'pending' })).toBe(true);
    expect(isAwaitingOnlinePayment({ payment_method: 'online', payment_status: 'failed', status: 'pending' })).toBe(true);
  });

  it('shows them once paid', () => {
    expect(isAwaitingOnlinePayment({ payment_method: 'online', payment_status: 'paid', status: 'pending' })).toBe(false);
  });

  it('never hides cash orders', () => {
    expect(isAwaitingOnlinePayment({ payment_method: 'cash', payment_status: 'pending', status: 'pending' })).toBe(false);
    expect(isAwaitingOnlinePayment({ payment_method: null, payment_status: null, status: 'pending' })).toBe(false);
  });

  it('keeps showing orders staff already moved forward', () => {
    expect(isAwaitingOnlinePayment({ payment_method: 'online', payment_status: 'pending', status: 'delivered' })).toBe(false);
  });
});
