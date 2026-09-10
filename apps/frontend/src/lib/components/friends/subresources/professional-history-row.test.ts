import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '$lib/i18n/locales/en.json';
import { render, screen, useLanguage, withDefaultLocale } from '$lib/test';
import type { ProfessionalHistory } from '$shared';
import ProfessionalHistoryRow from './professional-history-row.svelte';

const strings = en.subresources;

const history = (overrides: Partial<ProfessionalHistory> = {}): ProfessionalHistory => ({
  id: 'h-1',
  fromMonth: 1,
  fromYear: 2020,
  isPrimary: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Renders twice (mobile + desktop), so queries use *All*.
describe('ProfessionalHistoryRow', () => {
  beforeEach(async () => {
    await useLanguage('en');
  });

  it('renders "title at organization" with an open-ended range', () => {
    withDefaultLocale('en-US', () =>
      render(ProfessionalHistoryRow, {
        history: history({
          jobTitle: 'Engineer',
          organization: 'ACME',
          fromMonth: 3,
          fromYear: 2020,
        }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    expect(screen.getAllByText('Engineer at ACME').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(new RegExp(`Mar 2020 - ${strings.employment.present}`)).length,
    ).toBeGreaterThan(0);
  });

  it('includes department and a closed date range', () => {
    withDefaultLocale('en-US', () =>
      render(ProfessionalHistoryRow, {
        history: history({
          jobTitle: 'Eng',
          department: 'R&D',
          fromMonth: 1,
          fromYear: 2018,
          toMonth: 6,
          toYear: 2020,
        }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    expect(screen.getAllByText(/R&D/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Jan 2018 - Jun 2020/).length).toBeGreaterThan(0);
  });

  it('shows a Primary badge for the primary entry', () => {
    render(ProfessionalHistoryRow, {
      history: history({ isPrimary: true }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(screen.getAllByText(strings.common.primary).length).toBeGreaterThan(0);
  });

  it('renders German month names, join word and open end', async () => {
    await useLanguage('de');
    withDefaultLocale('de-DE', () =>
      render(ProfessionalHistoryRow, {
        history: history({
          jobTitle: 'Ingenieurin',
          organization: 'ACME',
          fromMonth: 5,
          fromYear: 2019,
        }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    expect(screen.getAllByText('Ingenieurin bei ACME').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mai 2019 - Heute/).length).toBeGreaterThan(0);
  });
});
