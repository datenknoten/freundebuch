import { beforeAll, describe, expect, it } from 'vitest';
import ForgotPasswordForm from '$lib/components/ForgotPasswordForm.svelte';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';

describe('ForgotPasswordForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  describe('fields', () => {
    it('labels the email field', () => {
      renderWithContext(ForgotPasswordForm, { props: {} });

      expect(labelFor('email')).toContain('Email address');
      expect(control('email').type).toBe('email');
      expect(control('email').autocomplete).toBe('email');
    });
  });
});
