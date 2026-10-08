import { describe, expect, it } from 'vitest';
import { checkPassword, isPasswordValid } from './passwordRules';

const met = (password: string) => Object.fromEntries(checkPassword(password).map((rule) => [rule.id, rule.met]));

describe('passwordRules', () => {
  it('checks length, upper and lower case separately', () => {
    expect(met('')).toEqual({ length: false, upper: false, lower: false });
    expect(met('abcdefgh')).toEqual({ length: true, upper: false, lower: true });
    expect(met('ABCDEFGH')).toEqual({ length: true, upper: true, lower: false });
    expect(met('Ab1')).toEqual({ length: false, upper: true, lower: true });
  });

  it('counts Turkish letters', () => {
    expect(met('çalışmaĞ')).toEqual({ length: true, upper: true, lower: true });
  });

  it('accepts a password only when every rule is met', () => {
    expect(isPasswordValid('Deneme12')).toBe(true);
    expect(isPasswordValid('deneme12')).toBe(false);
  });
});
