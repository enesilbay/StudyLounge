import { parseCorsOrigins } from './cors';

const matches = (origins: (string | RegExp)[] | undefined, origin: string) =>
  (origins ?? []).some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin),
  );

describe('parseCorsOrigins', () => {
  it('returns undefined when nothing specific is configured', () => {
    expect(parseCorsOrigins(undefined, undefined)).toBeUndefined();
    expect(parseCorsOrigins('*', '')).toBeUndefined();
  });

  it('splits the comma separated list', () => {
    expect(parseCorsOrigins('https://a.app, https://b.app')).toEqual([
      'https://a.app',
      'https://b.app',
    ]);
  });

  it('adds an anchored pattern for deploy previews', () => {
    const origins = parseCorsOrigins(
      'https://staging--cozy-melba-59db2a.netlify.app',
      'https://deploy-preview-\\d+--cozy-melba-59db2a\\.netlify\\.app',
    );
    expect(
      matches(origins, 'https://staging--cozy-melba-59db2a.netlify.app'),
    ).toBe(true);
    expect(
      matches(
        origins,
        'https://deploy-preview-12--cozy-melba-59db2a.netlify.app',
      ),
    ).toBe(true);
    expect(
      matches(
        origins,
        'https://deploy-preview-12--cozy-melba-59db2a.netlify.app.evil.com',
      ),
    ).toBe(false);
    expect(
      matches(
        origins,
        'https://evil.com/https://deploy-preview-1--cozy-melba-59db2a.netlify.app',
      ),
    ).toBe(false);
    expect(matches(origins, 'https://cozy-melba-59db2a.netlify.app')).toBe(
      false,
    );
  });

  it('ignores an invalid pattern', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    expect(parseCorsOrigins('https://a.app', '(')).toEqual(['https://a.app']);
    warn.mockRestore();
  });
});
