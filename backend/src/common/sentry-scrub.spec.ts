import { REDACTED, scrubEvent, scrubValue } from './sentry-scrub';

describe('sentry-scrub', () => {
  it('ic ice nesne ve dizilerdeki hassas alanlari siler', () => {
    const input = {
      email: 'a@b.com',
      password: 'gizli',
      newPassword: 'gizli2',
      profile: { name: 'Ali', accessToken: 'abc' },
      items: [{ code: '123456', id: 1 }],
    };
    expect(scrubValue(input)).toEqual({
      email: 'a@b.com',
      password: REDACTED,
      newPassword: REDACTED,
      profile: { name: 'Ali', accessToken: REDACTED },
      items: [{ code: REDACTED, id: 1 }],
    });
  });

  it('istek govdesi, basliklar, cerezler ve sorgu dizesini temizler', () => {
    const event = scrubEvent({
      request: {
        data: JSON.stringify({ username: 'ali', password: 'x' }),
        headers: {
          Authorization: 'Bearer t',
          'content-type': 'application/json',
        },
        cookies: { sid: '1' },
        query_string: 'token=abc',
      },
    });
    expect(event.request?.data).toEqual({
      username: 'ali',
      password: REDACTED,
    });
    expect(event.request?.headers).toEqual({
      Authorization: REDACTED,
      'content-type': 'application/json',
    });
    expect(event.request?.cookies).toBe(REDACTED);
    expect(event.request?.query_string).toBe(REDACTED);
  });

  it('JSON olmayan metin govdeyi tamamen siler', () => {
    expect(scrubEvent({ request: { data: 'password=x' } }).request?.data).toBe(
      REDACTED,
    );
  });
});
