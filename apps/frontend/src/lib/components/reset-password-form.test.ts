import { beforeAll, describe, expect, it } from 'vitest';
import { control, labelFor, render, screen, useLanguage } from '$lib/test';
import ResetPasswordForm from './reset-password-form.svelte';

describe('ResetPasswordForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('labels both password fields and drops the hand-rolled hint', () => {
    render(ResetPasswordForm, { token: 'tok' });

    expect(labelFor('password')).toContain('New password');
    expect(labelFor('confirm-password')).toContain('Confirm new password');
    expect((control('password') as HTMLInputElement).minLength).toBe(8);
    expect(screen.getAllByText('Must be at least 8 characters long').length).toBe(2);
  });
});
