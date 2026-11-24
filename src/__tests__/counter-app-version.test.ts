import { describe, expect, it } from 'vitest';
import { counterAppVersionFromUA, isOlderAppVersion } from '@/lib/counter-app';

describe('counterAppVersionFromUA', () => {
  it('lee la versión del marcador que agrega la app', () => {
    expect(counterAppVersionFromUA('Mozilla/5.0 (Linux; Android 15) Chrome/131 Mobile Safari/537.36 MeniusCounterApp/1.0.7')).toBe('1.0.7');
  });
  it('null en un navegador común o sin UA', () => {
    expect(counterAppVersionFromUA('Mozilla/5.0 (Windows NT 10.0) Chrome/131')).toBeNull();
    expect(counterAppVersionFromUA(null)).toBeNull();
  });
  it('devuelve solo dígitos y puntos (el valor va dentro de un filtro PostgREST)', () => {
    expect(counterAppVersionFromUA('MeniusCounterApp/1.0.7,id.neq.x')).toBe('1.0.7');
    expect(counterAppVersionFromUA('MeniusCounterApp/1.0.7-beta')).toBe('1.0.7');
    expect(counterAppVersionFromUA('MeniusCounterApp/abc')).toBeNull();
    expect(counterAppVersionFromUA('MeniusCounterApp/1.0.7x')).toBeNull();
  });
});

describe('isOlderAppVersion', () => {
  it('compara por número, no por texto', () => {
    expect(isOlderAppVersion('1.0.5', '1.0.8')).toBe(true);
    expect(isOlderAppVersion('1.0.9', '1.0.10')).toBe(true);
    expect(isOlderAppVersion('1.0.8', '1.0.8')).toBe(false);
    expect(isOlderAppVersion('1.1', '1.0.9')).toBe(false);
  });
});
