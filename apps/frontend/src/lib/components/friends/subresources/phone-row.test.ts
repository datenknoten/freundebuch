import { describe, expect, it, vi } from 'vitest';
import { aPhone, fireEvent, render, screen } from '$lib/test';
import PhoneRow from './phone-row.svelte';

// The row renders twice (mobile swipeable + desktop hover), so queries use *All*.
describe('PhoneRow', () => {
  it('renders the phone number as a tel: link and the formatted type', () => {
    render(PhoneRow, {
      phone: aPhone({ phoneNumber: '+1 555 0100', phoneType: 'work' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    const link = screen.getAllByRole('link')[0];
    expect(link.getAttribute('href')).toBe('tel:+1 555 0100');
    expect(screen.getAllByText('Work').length).toBeGreaterThan(0);
  });

  it('shows a Primary badge for a primary phone', () => {
    render(PhoneRow, { phone: aPhone({ isPrimary: true }), onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.getAllByText('Primary').length).toBeGreaterThan(0);
  });

  it('does not show a Primary badge for a non-primary phone', () => {
    render(PhoneRow, { phone: aPhone({ isPrimary: false }), onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.queryByText('Primary')).toBeNull();
  });

  it('invokes onEdit and onDelete from the row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(PhoneRow, { phone: aPhone(), onEdit, onDelete });

    await fireEvent.click(screen.getAllByLabelText('Edit phone')[0]);
    expect(onEdit).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getAllByLabelText('Delete phone')[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
