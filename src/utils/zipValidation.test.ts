import { describe, expect, it } from 'vitest';
import { isValidZipCode } from './zipValidation';

describe('isValidZipCode', () => {
  it('accepts 5-digit numeric zip codes', () => {
    expect(isValidZipCode('90210')).toBe(true);
    expect(isValidZipCode('00000')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidZipCode('9021')).toBe(false);
    expect(isValidZipCode('902101')).toBe(false);
    expect(isValidZipCode('9021a')).toBe(false);
    expect(isValidZipCode('')).toBe(false);
    expect(isValidZipCode(' 90210')).toBe(false);
  });
});
