import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '$lib/test';
import type { ProfessionalHistory } from '$shared';
import ProfessionalHistoryRow from './professional-history-row.svelte';

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
  it('renders "title at organization" with an open-ended range', () => {
    render(ProfessionalHistoryRow, {
      history: history({
        jobTitle: 'Engineer',
        organization: 'ACME',
        fromMonth: 3,
        fromYear: 2020,
      }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('Engineer at ACME').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mar 2020 - Present/).length).toBeGreaterThan(0);
  });

  it('includes department and a closed date range', () => {
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
    });

    expect(screen.getAllByText(/R&D/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Jan 2018 - Jun 2020/).length).toBeGreaterThan(0);
  });

  it('shows a Primary badge for the primary entry', () => {
    render(ProfessionalHistoryRow, {
      history: history({ isPrimary: true }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(screen.getAllByText('Primary').length).toBeGreaterThan(0);
  });
});
