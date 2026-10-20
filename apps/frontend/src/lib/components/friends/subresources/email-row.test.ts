import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EmailRow from '$lib/components/friends/subresources/EmailRow.svelte';
import en from '$lib/i18n/locales/en.json';
import { anEmail } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, render, screen } from '$lib/test/render.js';

const strings = en.subresources;

// Renders twice (mobile + desktop), so queries use *All*.
describe('EmailRow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders the address as a mailto: link and the formatted type', () => {
      render(EmailRow, {
        email: anEmail({ emailAddress: 'ada@example.com', emailType: 'work' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      });

      expect(itemAt(screen.getAllByRole('link'), 0).getAttribute('href')).toBe(
        'mailto:ada@example.com',
      );
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
  });

  describe('primary badge', () => {
    it('shows a Primary badge only for the primary email', () => {
      render(EmailRow, { email: anEmail({ isPrimary: true }), onEdit: vi.fn(), onDelete: vi.fn() });
      expect(screen.getAllByText(strings.common.primary).length).toBeGreaterThan(0);
    });
  });

  describe('row actions', () => {
    it('invokes onEdit and onDelete from the row actions', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      render(EmailRow, { email: anEmail(), onEdit, onDelete });

      await fireEvent.click(itemAt(screen.getAllByLabelText(strings.email.editAria), 0));
      await fireEvent.click(itemAt(screen.getAllByLabelText(strings.email.deleteAria), 0));

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });
});
