import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test';
import FormSelect from './form-select.svelte';

describe('FormSelect', () => {
  it('renders the options and selects the current value', () => {
    render(FormSelect, {
      id: 'type',
      label: 'Type',
      value: 'b',
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
    });

    const select = screen.getByLabelText('Type') as HTMLSelectElement;
    expect(select.value).toBe('b');
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('renders a placeholder option when provided', () => {
    render(FormSelect, {
      id: 'type',
      label: 'Type',
      value: '',
      options: [{ value: 'a', label: 'Alpha' }],
      placeholderOption: 'Choose one',
    });
    expect(screen.getByText('Choose one')).toBeTruthy();
  });

  it('marks the field required with an asterisk', () => {
    render(FormSelect, {
      id: 'type',
      label: 'Type',
      value: 'a',
      options: [{ value: 'a', label: 'Alpha' }],
      required: true,
    });
    expect(screen.getByText('*')).toBeTruthy();
  });
});
