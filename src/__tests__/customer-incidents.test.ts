import { describe, it, expect } from 'vitest';
import { customerFlagLabel, isOrderIncident } from '@/lib/customer-incidents';

describe('customer incidents', () => {
  it('accepts only the two incident codes', () => {
    expect(isOrderIncident('not_received')).toBe(true);
    expect(isOrderIncident('not_paid')).toBe(true);
    expect(isOrderIncident('Out of stock')).toBe(false);
    expect(isOrderIncident(null)).toBe(false);
  });

  it('labels the alert for the Counter', () => {
    expect(customerFlagLabel({ incident_count: 1, last_incident: 'not_received', last_incident_at: null }, false))
      .toBe('Ojo: su último pedido no lo recibió');
    expect(customerFlagLabel({ incident_count: 2, last_incident: 'not_paid', last_incident_at: null }, true))
      .toBe("Flagged: 2 problem orders (last: didn't pay)");
  });
});
