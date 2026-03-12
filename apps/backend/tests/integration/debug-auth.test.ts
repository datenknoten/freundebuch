import { describe, expect, it } from 'vitest';
import { setupAuthTestSuite } from './auth.helpers.js';

describe('Debug Better Auth responses', () => {
  const { getContext } = setupAuthTestSuite();

  it('should show sign-up response', async () => {
    const { app } = getContext();
    const request = new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'debug@test.com',
        password: 'SecurePassword123',
        name: 'debug',
      }),
    });
    const response = await app.fetch(request);
    const body = await response.json();
    console.log('SIGN-UP STATUS:', response.status);
    console.log('SIGN-UP BODY:', JSON.stringify(body, null, 2));
    console.log('SIGN-UP COOKIES:', response.headers.get('Set-Cookie'));
    expect(response.status).toBe(200);
  });

  it('should show sign-in response', async () => {
    const { app } = getContext();
    // Sign up first
    await app.fetch(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'debug2@test.com',
          password: 'SecurePassword123',
          name: 'debug2',
        }),
      }),
    );
    // Sign in
    const request = new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'debug2@test.com', password: 'SecurePassword123' }),
    });
    const response = await app.fetch(request);
    const body = await response.json();
    console.log('SIGN-IN STATUS:', response.status);
    console.log('SIGN-IN BODY:', JSON.stringify(body, null, 2));
    console.log('SIGN-IN COOKIES:', response.headers.get('Set-Cookie'));
    expect(response.status).toBe(200);
  });

  it('should show /me response with cookie auth', async () => {
    const { app } = getContext();
    // Sign up
    const regRes = await app.fetch(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'debug3@test.com',
          password: 'SecurePassword123',
          name: 'debug3',
        }),
      }),
    );
    const cookies =
      regRes.headers
        .getSetCookie?.()
        .map((h) => h.split(';')[0])
        .join('; ') || '';
    console.log('COOKIES FOR ME:', cookies);
    // Call /me
    const meRes = await app.fetch(
      new Request('http://localhost/api/auth/me', {
        method: 'GET',
        headers: { Cookie: cookies },
      }),
    );
    let meBody: unknown;
    try {
      meBody = await meRes.json();
    } catch {
      meBody = await meRes.text();
    }
    console.log('ME STATUS:', meRes.status);
    console.log('ME BODY:', JSON.stringify(meBody, null, 2));
    expect(meRes.status).toBe(200);
  });
});
