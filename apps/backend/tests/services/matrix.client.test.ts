import dns from 'node:dns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendMatrixMessage } from '../../src/services/external/matrix.client.js';
import { NotificationDeliveryError, ValidationError } from '../../src/utils/errors.js';

/**
 * The SSRF guard has to survive a *public* hostname that resolves to a private
 * address, which is why the resolver is stubbed rather than the URL string.
 */
function stubLookup(...addresses: string[]): void {
  vi.spyOn(dns.promises, 'lookup').mockResolvedValue(
    addresses.map((address) => ({
      address,
      family: address.includes(':') ? 6 : 4,
    })) as never,
  );
}

describe('sendMatrixMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a public hostname that resolves to loopback', async () => {
    stubLookup('127.0.0.1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      sendMatrixMessage(
        'https://matrix.example.com',
        'token',
        '!room:example.com',
        'hi',
        '<b>hi</b>',
      ),
    ).rejects.toThrow(ValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects when any resolved address is private', async () => {
    stubLookup('93.184.216.34', '169.254.169.254');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      sendMatrixMessage(
        'https://matrix.example.com',
        'token',
        '!room:example.com',
        'hi',
        '<b>hi</b>',
      ),
    ).rejects.toThrow(ValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects plain http', async () => {
    stubLookup('93.184.216.34');

    await expect(
      sendMatrixMessage(
        'http://matrix.example.com',
        'token',
        '!room:example.com',
        'hi',
        '<b>hi</b>',
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('sends when every resolved address is public', async () => {
    stubLookup('93.184.216.34');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await sendMatrixMessage(
      'https://matrix.example.com',
      'token',
      '!room:example.com',
      'hi',
      '<b>hi</b>',
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain('https://matrix.example.com/_matrix/client/v3/rooms/');
  });

  it('does not follow a redirect away from the checked homeserver', async () => {
    stubLookup('93.184.216.34');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(null, { status: 307, headers: { location: 'http://127.0.0.1/' } }),
      );

    await expect(
      sendMatrixMessage(
        'https://matrix.example.com',
        'token',
        '!room:example.com',
        'hi',
        '<b>hi</b>',
      ),
    ).rejects.toThrow(NotificationDeliveryError);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ redirect: 'manual' }),
    );
  });
});
