import { beforeAll, describe, expect, it } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, render } from '$lib/test/render.js';
import ForgotPasswordForm from './ForgotPasswordForm.svelte';

describe('ForgotPasswordForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('labels the email field', () => {
    render(ForgotPasswordForm, {});

    expect(labelFor('email')).toContain('Email address');
    expect(control('email').type).toBe('email');
    expect((control('email') as HTMLInputElement).autocomplete).toBe('email');
  });
});
