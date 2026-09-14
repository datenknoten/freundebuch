import { beforeAll, describe, expect, it } from 'vitest';
import { control, labelFor, render, screen, useLanguage } from '$lib/test';
import RegisterForm from './register-form.svelte';

describe('RegisterForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('shows the shared password helper on both password fields', () => {
    render(RegisterForm, {});

    expect((control('email') as HTMLInputElement).autocomplete).toBe('email');
    for (const id of ['password', 'confirm-password']) {
      const field = control(id) as HTMLInputElement;
      expect(field.type).toBe('password');
      expect(field.autocomplete).toBe('new-password');
      expect(field.minLength).toBe(8);
      expect(field.placeholder).toBe('••••••••');
      expect(field.getAttribute('aria-describedby')).toBe(`${id}-helper`);
    }
    expect(screen.getAllByText('Must be at least 8 characters long').length).toBe(2);

    // The terms checkbox keeps its rich label (it embeds two links).
    expect(control('terms').type).toBe('checkbox');
    expect(labelFor('terms')).toContain('Terms of Service');
  });
});
