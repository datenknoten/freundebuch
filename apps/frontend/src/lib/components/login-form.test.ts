import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  control,
  jsonResponse,
  labelFor,
  render,
  restoreFetch,
  screen,
  stubFetch,
  useLanguage,
} from '$lib/test';
import LoginForm from './login-form.svelte';

describe('LoginForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  afterEach(restoreFetch);

  it('labels the login fields and keeps the passkey autofill hint', () => {
    stubFetch(jsonResponse({ signupEnabled: true }));
    render(LoginForm, {});

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
