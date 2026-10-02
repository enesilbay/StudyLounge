import { defaults, types } from 'pg';
import { parseUtcTimestamp } from './pg-utc';

describe('pg UTC timestamps', () => {
  it('reads timezone-less values as UTC regardless of the server timezone', () => {
    expect(parseUtcTimestamp('2026-10-02 22:39:03.123456').toISOString()).toBe(
      '2026-10-02T22:39:03.123Z',
    );
    expect(parseUtcTimestamp('2026-01-01 00:00:00').toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('registers the parser and UTC serialization on import', () => {
    expect(types.getTypeParser(types.builtins.TIMESTAMP)).toBe(
      parseUtcTimestamp,
    );
    expect(defaults.parseInputDatesAsUTC).toBe(true);
  });
});
