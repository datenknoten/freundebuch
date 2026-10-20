import { beforeAll, describe, expect, it } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import ForgotPasswordForm from './ForgotPasswordForm.svelte';

describe('ForgotPasswordForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('labels the email field', () => {
    renderWithContext(ForgotPasswordForm, { props: {} });

    expect(labelFor('email')).toContain('Email address');
    expect(control('email').type).toBe('email');
    expect((control('email') as HTMLInputElement).autocomplete).toBe('email');
  });
});
