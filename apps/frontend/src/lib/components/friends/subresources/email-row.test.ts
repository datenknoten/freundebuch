import { describe, expect, it, vi } from 'vitest';
import { anEmail, fireEvent, render, screen } from '$lib/test';
import EmailRow from './email-row.svelte';

// Renders twice (mobile + desktop), so queries use *All*.
describe('EmailRow', () => {
  it('renders the address as a mailto: link and the formatted type', () => {
    render(EmailRow, {
      email: anEmail({ emailAddress: 'ada@example.com', emailType: 'work' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('mailto:ada@example.com');
    expect(screen.getAllByText('Work').length).toBeGreaterThan(0);
  });

  it('shows a Primary badge only for the primary email', () => {
    render(EmailRow, { email: anEmail({ isPrimary: true }), onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.getAllByText('Primary').length).toBeGreaterThan(0);
  });

  it('invokes onEdit and onDelete from the row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(EmailRow, { email: anEmail(), onEdit, onDelete });

    await fireEvent.click(screen.getAllByLabelText('Edit email')[0]);
    await fireEvent.click(screen.getAllByLabelText('Delete email')[0]);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
