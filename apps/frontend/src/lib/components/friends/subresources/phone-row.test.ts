import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '$lib/i18n/locales/en.json';
import { aPhone, fireEvent, render, screen, useLanguage } from '$lib/test';
import PhoneRow from './phone-row.svelte';

const strings = en.subresources;

// The row renders twice (mobile swipeable + desktop hover), so queries use *All*.
describe('PhoneRow', () => {
  beforeEach(async () => {
    await useLanguage('en');
  });

  it('renders the phone number as a tel: link and the formatted type', () => {
    render(PhoneRow, {
      phone: aPhone({ phoneNumber: '+1 555 0100', phoneType: 'work' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    const link = screen.getAllByRole('link')[0];
    expect(link.getAttribute('href')).toBe('tel:+1 555 0100');
    expect(screen.getAllByText(strings.phone.types.work).length).toBeGreaterThan(0);
  });

  it('translates the type label and the primary badge', async () => {
    await useLanguage('de');
    render(PhoneRow, {
      phone: aPhone({ phoneType: 'mobile', isPrimary: true }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('Mobil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Primär').length).toBeGreaterThan(0);
    expect(screen.queryByText(strings.common.primary)).toBeNull();
  });

  it('shows a Primary badge for a primary phone', () => {
    render(PhoneRow, { phone: aPhone({ isPrimary: true }), onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.getAllByText(strings.common.primary).length).toBeGreaterThan(0);
  });

  it('does not show a Primary badge for a non-primary phone', () => {
    render(PhoneRow, { phone: aPhone({ isPrimary: false }), onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.queryByText(strings.common.primary)).toBeNull();
  });

  it('invokes onEdit and onDelete from the row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(PhoneRow, { phone: aPhone(), onEdit, onDelete });

    await fireEvent.click(screen.getAllByLabelText(strings.phone.editAria)[0]);
    expect(onEdit).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getAllByLabelText(strings.phone.deleteAria)[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
