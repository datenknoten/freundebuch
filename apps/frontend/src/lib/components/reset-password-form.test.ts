import { beforeAll, describe, expect, it } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import ResetPasswordForm from './ResetPasswordForm.svelte';

describe('ResetPasswordForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('labels both password fields and drops the hand-rolled hint', () => {
    renderWithContext(ResetPasswordForm, { props: { token: 'tok' } });

    expect(labelFor('password')).toContain('New password');
    expect(labelFor('confirm-password')).toContain('Confirm new password');
    expect((control('password') as HTMLInputElement).minLength).toBe(8);
    expect(screen.getAllByText('Must be at least 8 characters long').length).toBe(2);
  });
});
