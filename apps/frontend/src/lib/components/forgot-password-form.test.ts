import { beforeAll, describe, expect, it } from 'vitest';
import { control, labelFor, render, useLanguage } from '$lib/test';
import ForgotPasswordForm from './forgot-password-form.svelte';

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
