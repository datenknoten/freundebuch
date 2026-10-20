import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test/render.js';
import FormTextarea from './FormTextarea.svelte';

describe('FormTextarea', () => {
  describe('when rendered', () => {
    it('renders a labelled textarea with the given value and rows', () => {
      render(FormTextarea, { id: 'notes', label: 'Notes', value: 'hello', rows: 5 });

      const area = screen.getByLabelText('Notes') as HTMLTextAreaElement;
      expect(area.value).toBe('hello');
      expect(area.rows).toBe(5);
    });
  });

  describe('when disabled', () => {
    it('disables the textarea when disabled', () => {
      render(FormTextarea, { id: 'notes', label: 'Notes', value: '', disabled: true });
      expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).disabled).toBe(true);
    });
  });
});
