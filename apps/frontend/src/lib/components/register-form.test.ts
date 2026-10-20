import { beforeAll, describe, expect, it } from 'vitest';
import RegisterForm from '$lib/components/RegisterForm.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';

function input(id: string) {
  const field = control(id);
  if (field instanceof HTMLInputElement) {
    return field;
  }
  throw new InvariantError(`the ${id} control is not an input`);
}

describe('RegisterForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  describe('fields', () => {
    it('shows the shared password helper on both password fields', () => {
      renderWithContext(RegisterForm, { props: {} });

      expect(control('email').autocomplete).toBe('email');
      for (const id of ['password', 'confirm-password']) {
        const field = input(id);
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
});
