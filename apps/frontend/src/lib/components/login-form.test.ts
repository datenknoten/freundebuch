import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import LoginForm from './LoginForm.svelte';

describe('LoginForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('labels the login fields and keeps the passkey autofill hint', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}')));
    renderWithContext(LoginForm, { props: {} });

    expect(labelFor('email')).toContain('Email');
    expect(control('email').type).toBe('email');
    expect((control('email') as HTMLInputElement).autocomplete).toBe('username webauthn');
    expect(control('email').required).toBe(true);

    expect(labelFor('password')).toContain('Password');
    expect(control('password').type).toBe('password');
    expect((control('password') as HTMLInputElement).autocomplete).toBe('current-password');
    expect((control('password') as HTMLInputElement).minLength).toBe(8);
    expect((control('password') as HTMLInputElement).placeholder).toBe('••••••••');
    expect(screen.getAllByText('Must be at least 8 characters long').length).toBe(1);
    expect(document.querySelectorAll('label[for="password"]').length).toBe(1);
  });
});
