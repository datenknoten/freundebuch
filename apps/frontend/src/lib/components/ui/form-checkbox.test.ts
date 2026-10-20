import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test/render.js';
import FormCheckbox from './FormCheckbox.svelte';

describe('FormCheckbox', () => {
  describe('when rendered', () => {
    it('renders a labelled checkbox reflecting the checked state', () => {
      render(FormCheckbox, { id: 'tos', label: 'Accept terms', checked: true });

      const box = screen.getByLabelText('Accept terms') as HTMLInputElement;
      expect(box.type).toBe('checkbox');
      expect(box.checked).toBe(true);
    });
  });

  describe('when disabled', () => {
    it('disables the checkbox when disabled', () => {
      render(FormCheckbox, { id: 'tos', label: 'Accept terms', checked: false, disabled: true });
      expect((screen.getByLabelText('Accept terms') as HTMLInputElement).disabled).toBe(true);
    });
  });
});
