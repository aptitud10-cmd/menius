import { describe, it, expect } from 'vitest';
import {
  PAIRING_ALPHABET,
  generatePairingCode,
  normalizePairingCode,
  generateDeviceSecret,
  hashDeviceSecret,
  deviceSecretMatches,
  formatPairingCode,
} from '@/lib/device-pairing';

describe('device pairing codes', () => {
  it('generates 6-char codes only from the unambiguous alphabet', () => {
    for (let i = 0; i < 500; i++) {
      const code = generatePairingCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      for (const ch of code) expect(PAIRING_ALPHABET).toContain(ch);
    }
  });

  it('alphabet has no look-alike characters', () => {
    for (const ch of ['I', 'L', 'O', 'Q', '0', '1']) expect(PAIRING_ALPHABET).not.toContain(ch);
  });

  it('accepts what a person types', () => {
    expect(normalizePairingCode('k7m-4px')).toBe('K7M4PX');
    expect(normalizePairingCode(' K7M 4PX ')).toBe('K7M4PX');
    expect(normalizePairingCode('K7M4PX')).toBe('K7M4PX');
  });

  it('rejects anything that cannot be a code', () => {
    expect(normalizePairingCode('K7M4P')).toBeNull();
    expect(normalizePairingCode('K7M4PXX')).toBeNull();
    expect(normalizePairingCode('K7M4P0')).toBeNull(); // 0 is not in the alphabet
    expect(normalizePairingCode('KOM4PX')).toBeNull(); // O neither
    expect(normalizePairingCode(123456)).toBeNull();
    expect(normalizePairingCode(null)).toBeNull();
  });

  it('formats for display', () => {
    expect(formatPairingCode('K7M4PX')).toBe('K7M-4PX');
  });
});

describe('device secret', () => {
  it('is long and random', () => {
    const a = generateDeviceSecret();
    const b = generateDeviceSecret();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).not.toBe(b);
  });

  it('matches only the exact secret', () => {
    const secret = generateDeviceSecret();
    const hash = hashDeviceSecret(secret);
    expect(deviceSecretMatches(secret, hash)).toBe(true);
    expect(deviceSecretMatches(generateDeviceSecret(), hash)).toBe(false);
    expect(deviceSecretMatches('', hash)).toBe(false);
    expect(deviceSecretMatches(undefined, hash)).toBe(false);
    expect(deviceSecretMatches('x'.repeat(500), hash)).toBe(false);
  });
});
