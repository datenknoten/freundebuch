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

  it('renders a helper hint the input points at', () => {
    render(FormInput, { id: 'pw', label: 'Password', value: '', helper: 'At least 8 characters' });

    const input = screen.getByLabelText('Password');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('pw-helper');
    expect(screen.getByText('At least 8 characters').id).toBe('pw-helper');
  });

  it('marks the input invalid and describes it by both the error and the helper', () => {
    render(FormInput, {
      id: 'pw',
      label: 'Password',
      value: 'short',
      helper: 'At least 8 characters',
      error: 'Password is too short',
    });

    const input = screen.getByLabelText('Password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')?.split(' ').sort()).toEqual([
      'pw-error',
      'pw-helper',
    ]);
    expect(screen.getByText('Password is too short').id).toBe('pw-error');
  });
});
