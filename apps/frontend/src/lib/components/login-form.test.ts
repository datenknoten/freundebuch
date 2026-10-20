import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginForm from '$lib/components/LoginForm.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';

function passwordInput() {
  const input = control('password');
  if (input instanceof HTMLInputElement) {
    return input;
  }
  throw new InvariantError('the password control is not an input');
}

describe('LoginForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('fields', () => {
    it('labels the login fields and keeps the passkey autofill hint', () => {
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}')));
      renderWithContext(LoginForm, { props: {} });

      expect(labelFor('email')).toContain('Email');
      expect(control('email').type).toBe('email');
      expect(control('email').autocomplete).toBe('username webauthn');
      expect(control('email').required).toBe(true);

      const password = passwordInput();
      expect(labelFor('password')).toContain('Password');
      expect(password.type).toBe('password');
      expect(password.autocomplete).toBe('current-password');
      expect(password.minLength).toBe(8);
      expect(password.placeholder).toBe('••••••••');
      expect(screen.getAllByText('Must be at least 8 characters long').length).toBe(1);
      expect(document.querySelectorAll('label[for="password"]').length).toBe(1);
    });
  });
});
