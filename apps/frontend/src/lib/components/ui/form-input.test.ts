import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test';
import FormInput from './form-input.svelte';

describe('FormInput', () => {
  it('associates the label with the input and reflects value/type', () => {
    render(FormInput, { id: 'email', label: 'Email', value: 'ada@example.com', type: 'email' });

    const input = screen.getByLabelText(/Email/) as HTMLInputElement;
    expect(input.value).toBe('ada@example.com');
    expect(input.type).toBe('email');
    expect(input.id).toBe('email');
  });

  it('marks the field required with an asterisk', () => {
    render(FormInput, { id: 'name', label: 'Name', value: '', required: true });

    expect((screen.getByLabelText(/Name/) as HTMLInputElement).required).toBe(true);
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('shows optional text when optional', () => {
    render(FormInput, {
      id: 'nick',
      label: 'Nickname',
      value: '',
      optional: true,
      optionalText: 'optional',
    });
    expect(screen.getByText('(optional)')).toBeTruthy();
  });

  it('disables the input when disabled', () => {
    render(FormInput, { id: 'x', label: 'X', value: '', disabled: true });
    expect((screen.getByLabelText('X') as HTMLInputElement).disabled).toBe(true);
  });
});
