import { describe, expect, it, vi } from 'vitest';

// Mock i18n so $i18n.t(key) echoes the key — lets tests assert on labels without
// depending on translation content. (vi.mock factory is hoisted, so the store is
// built inline here.)
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

import { aPhone, render, screen } from '$lib/test';
import PhoneEditForm from './phone-edit-form.svelte';

describe('PhoneEditForm', () => {
  // Required fields append a " *" to the label, so match labels as substrings.
  it('renders the phone fields with their (translated) labels', () => {
    render(PhoneEditForm, {});

    expect(screen.getByLabelText(/subresources\.phone\.phoneNumber/)).toBeTruthy();
    expect(screen.getByLabelText(/subresources\.common\.type/)).toBeTruthy();
    expect(screen.getByLabelText(/subresources\.common\.label/)).toBeTruthy();
    expect(screen.getByLabelText(/subresources\.phone\.primaryPhone/)).toBeTruthy();
  });

  it('offers the five phone type options', () => {
    render(PhoneEditForm, {});
    const select = screen.getByLabelText(/subresources\.common\.type/) as HTMLSelectElement;
    expect(select.options.length).toBe(5);
  });

  it('prefills the fields from initialData', () => {
    render(PhoneEditForm, {
      initialData: aPhone({ phoneNumber: '+1 555 0100', phoneType: 'work', isPrimary: true }),
    });

    expect(
      (screen.getByLabelText(/subresources\.phone\.phoneNumber/) as HTMLInputElement).value,
    ).toBe('+1 555 0100');
    expect((screen.getByLabelText(/subresources\.common\.type/) as HTMLSelectElement).value).toBe(
      'work',
    );
    expect(
      (screen.getByLabelText(/subresources\.phone\.primaryPhone/) as HTMLInputElement).checked,
    ).toBe(true);
  });
});
