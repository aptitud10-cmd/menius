/**
 * OrderStateMachine — explicit state transitions for the counter view.
 *
 * Maps DB status strings to semantic counter states and enforces
 * valid transitions. Any invalid transition throws so the UI
 * can show the right error instead of silently misrouting.
 *
 * DB status  →  Counter state
 * pending    →  NEW
 * confirmed  →  ACCEPTED
 * preparing  →  PREPARING
 * ready      →  READY
 * delivered  →  COMPLETED
 * cancelled  →  REJECTED
 */

export type CounterStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'REJECTED';

// Valid forward transitions for each state
const TRANSITIONS: Record<CounterStatus, CounterStatus[]> = {
  NEW:       ['ACCEPTED', 'REJECTED'],
  ACCEPTED:  ['PREPARING', 'REJECTED'],
  PREPARING: ['READY', 'REJECTED'],
  READY:     ['COMPLETED'],
  COMPLETED: [],
  REJECTED:  [],
};

// Bidirectional mapping with DB status strings
const TO_DB: Record<CounterStatus, string> = {
  NEW:       'pending',
  ACCEPTED:  'confirmed',
  PREPARING: 'preparing',
  READY:     'ready',
  COMPLETED: 'delivered',
  REJECTED:  'cancelled',
};

const FROM_DB: Record<string, CounterStatus> = {
  pending:   'NEW',
  confirmed: 'ACCEPTED',
  preparing: 'PREPARING',
  ready:     'READY',
  delivered: 'COMPLETED',
  cancelled: 'REJECTED',
};

export class OrderStateMachine {
  private _status: CounterStatus;

  constructor(initial: CounterStatus | string) {
    this._status =
      typeof initial === 'string' && initial in FROM_DB
        ? FROM_DB[initial]
        : (initial as CounterStatus);
  }

  get status(): CounterStatus {
    return this._status;
  }

  get dbStatus(): string {
    return TO_DB[this._status];
  }

  canTransition(to: CounterStatus): boolean {
    return TRANSITIONS[this._status].includes(to);
  }

  /** Returns the new status after a valid transition, or throws. */
  transition(to: CounterStatus): CounterStatus {
    if (!this.canTransition(to)) {
      throw new Error(
        `[OrderStateMachine] Invalid transition: ${this._status} → ${to}`
      );
    }
    this._status = to;
    return this._status;
  }

  /** All states reachable from the current state. */
  get nextStates(): CounterStatus[] {
    return TRANSITIONS[this._status];
  }

  get isTerminal(): boolean {
    return this._status === 'COMPLETED' || this._status === 'REJECTED';
  }

  get isActive(): boolean {
    return !this.isTerminal;
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  static fromDB(dbStatus: string): CounterStatus {
    return FROM_DB[dbStatus] ?? 'NEW';
  }

  static toDB(status: CounterStatus): string {
    return TO_DB[status];
  }

  static isValid(status: string): status is CounterStatus {
    return status in TRANSITIONS;
  }

  static create(dbStatus: string): OrderStateMachine {
    return new OrderStateMachine(OrderStateMachine.fromDB(dbStatus));
  }
}
