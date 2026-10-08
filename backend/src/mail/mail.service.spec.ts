import { ConfigService } from '@nestjs/config';
import { MailService, parseSender } from './mail.service';

const makeService = (env: Record<string, string>) =>
  new MailService({
    get: (key: string, fallback?: string) => env[key] ?? fallback,
  } as unknown as ConfigService);

describe('parseSender', () => {
  it('reads "Name <email>" and bare addresses', () => {
    expect(parseSender('StudyLounge <a@b.com>')).toEqual({
      name: 'StudyLounge',
      email: 'a@b.com',
    });
    expect(parseSender('"Study Lounge" <a@b.com>')).toEqual({
      name: 'Study Lounge',
      email: 'a@b.com',
    });
    expect(parseSender(' a@b.com ')).toEqual({ email: 'a@b.com' });
  });
});

describe('MailService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends through Brevo first when it is configured', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"messageId":"x"}', { status: 201 }),
    );
    const service = makeService({
      BREVO_API_KEY: 'brevo-key',
      BREVO_FROM: 'StudyLounge <noreply@test.com>',
      RESEND_API_KEY: 'resend-key',
      NODE_ENV: 'production',
    });

    await expect(
      service.sendVerificationEmail('user@test.com', '123456'),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'brevo-key',
    );
    const body = JSON.parse(init.body as string) as {
      sender: unknown;
      to: unknown;
      htmlContent: string;
    };
    expect(body.sender).toEqual({
      name: 'StudyLounge',
      email: 'noreply@test.com',
    });
    expect(body.to).toEqual([{ email: 'user@test.com' }]);
    expect(body.htmlContent).toContain('123456');
  });

  it('falls back to Resend when Brevo rejects the message', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response('{"message":"unauthorized"}', { status: 401 }),
      )
      .mockResolvedValueOnce(new Response('{"id":"y"}', { status: 200 }));
    const service = makeService({
      BREVO_API_KEY: 'brevo-key',
      BREVO_FROM: 'noreply@test.com',
      RESEND_API_KEY: 'resend-key',
      NODE_ENV: 'production',
    });

    await expect(
      service.sendVerificationEmail('user@test.com', '123456'),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.resend.com/emails',
      expect.anything(),
    );
  });

  it('skips Brevo without a sender and reports failure when nothing works', async () => {
    const service = makeService({
      BREVO_API_KEY: 'brevo-key',
      NODE_ENV: 'production',
    });

    await expect(
      service.sendVerificationEmail('user@test.com', '123456'),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
