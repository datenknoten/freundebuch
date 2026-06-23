import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test';
import FormTextarea from './form-textarea.svelte';

describe('FormTextarea', () => {
  it('renders a labelled textarea with the given value and rows', () => {
    render(FormTextarea, { id: 'notes', label: 'Notes', value: 'hello', rows: 5 });

    const area = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    expect(area.value).toBe('hello');
    expect(area.rows).toBe(5);
  });

  it('disables the textarea when disabled', () => {
    render(FormTextarea, { id: 'notes', label: 'Notes', value: '', disabled: true });
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).disabled).toBe(true);
  });
});
