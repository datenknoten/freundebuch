import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '$lib/i18n/locales/en.json';
import { anEmail, fireEvent, render, screen, useLanguage } from '$lib/test';
import EmailRow from './email-row.svelte';

const strings = en.subresources;

// Renders twice (mobile + desktop), so queries use *All*.
describe('EmailRow', () => {
  beforeEach(async () => {
    await useLanguage('en');
  });

  it('renders the address as a mailto: link and the formatted type', () => {
    render(EmailRow, {
      email: anEmail({ emailAddress: 'ada@example.com', emailType: 'work' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('mailto:ada@example.com');
    expect(screen.getAllByText(strings.email.types.work).length).toBeGreaterThan(0);
  });

  it('translates the type label', async () => {
    await useLanguage('de');
    render(EmailRow, {
      email: anEmail({ emailType: 'work' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('Arbeit').length).toBeGreaterThan(0);
    expect(screen.queryByText(strings.email.types.work)).toBeNull();
  });

  it('shows a Primary badge only for the primary email', () => {
    render(EmailRow, { email: anEmail({ isPrimary: true }), onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.getAllByText(strings.common.primary).length).toBeGreaterThan(0);
  });

  it('invokes onEdit and onDelete from the row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(EmailRow, { email: anEmail(), onEdit, onDelete });

    await fireEvent.click(screen.getAllByLabelText(strings.email.editAria)[0]);
    await fireEvent.click(screen.getAllByLabelText(strings.email.deleteAria)[0]);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
