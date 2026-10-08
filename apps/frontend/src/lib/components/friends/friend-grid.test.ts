import type { ComponentProps } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, useLanguage, within } from '$lib/test';
import type { ColumnId, FriendGridItem } from '$shared';
import FriendGrid from './friend-grid.svelte';

const navigation = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => navigation);

// Hoisted above the mock factory so the test body and the mocked module share
// the same store. Hand-rolled rather than `writable`, because `vi.hoisted`
// runs before this file's imports.
const language = vi.hoisted(() => {
  let value = 'en';
  const subscribers = new Set<(v: string) => void>();
  return {
    subscribe(run: (v: string) => void) {
      subscribers.add(run);
      run(value);
      return () => {
        subscribers.delete(run);
      };
    },
    set(next: string) {
      value = next;
      for (const run of subscribers) run(value);
    },
  };
});

vi.mock('$lib/stores/locale', () => ({ currentLanguage: language }));

async function useCountryLanguage(lang: 'en' | 'de') {
  await useLanguage(lang);
  language.set(lang);
}

let nextId = 0;
function anItem(overrides: Partial<FriendGridItem> = {}): FriendGridItem {
  nextId += 1;
  return { id: `friend-${nextId}`, displayName: 'Ada Lovelace', circles: [], ...overrides };
}

function renderGrid(props: Partial<ComponentProps<typeof FriendGrid>> = {}) {
  const onSortChange = vi.fn();
  render(FriendGrid, {
    items: [anItem()],
    columns: ['avatar', 'displayName'] as ColumnId[],
    sortBy: 'display_name',
    sortOrder: 'asc',
    birthdayFormat: 'iso',
    onSortChange,
    ...props,
  });
  return { onSortChange };
}

/** The desktop table body rows (header row excluded). */
function bodyRows(): HTMLElement[] {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

/** The text of the desktop table cell for `column` in the first body row. */
function cellText(columns: ColumnId[], column: ColumnId): string {
  const cells = within(bodyRows()[0]).getAllByRole('cell');
  return cells[columns.indexOf(column)].textContent?.trim() ?? '';
}

function header(name: string): HTMLElement {
  return within(screen.getByRole('table')).getByRole('columnheader', { name });
}

describe('FriendGrid', () => {
  beforeEach(async () => {
    await useCountryLanguage('en');
  });

  afterEach(() => {
    navigation.goto.mockReset();
  });

  describe('country column', () => {
    const columns: ColumnId[] = ['displayName', 'primaryCountry'];

    it('shows the country name for a stored code', () => {
      renderGrid({ columns, items: [anItem({ primaryCountry: 'DE' })] });

      expect(cellText(columns, 'primaryCountry')).toBe('Germany');
    });

    it('shows the country name in the UI language', async () => {
      await useCountryLanguage('de');
      renderGrid({ columns, items: [anItem({ primaryCountry: 'DE' })] });

      expect(cellText(columns, 'primaryCountry')).toBe('Deutschland');
    });

    it('shows legacy free text unchanged', () => {
      renderGrid({ columns, items: [anItem({ primaryCountry: 'Atlantis' })] });

      expect(cellText(columns, 'primaryCountry')).toBe('Atlantis');
    });

    it('leaves the cell empty when the friend has no country', () => {
      renderGrid({ columns, items: [anItem()] });

      expect(cellText(columns, 'primaryCountry')).toBe('');
    });
  });

  describe('text columns', () => {
    it('shows each text field in its column', () => {
      const columns: ColumnId[] = [
        'nickname',
        'organization',
        'jobTitle',
        'department',
        'primaryCity',
      ];
      renderGrid({
        columns,
        items: [
          anItem({
            nickname: 'Countess',
            organization: 'Analytical Society',
            jobTitle: 'Mathematician',
            department: 'Research',
            primaryCity: 'London',
          }),
        ],
      });

      expect(cellText(columns, 'nickname')).toBe('Countess');
      expect(cellText(columns, 'organization')).toBe('Analytical Society');
      expect(cellText(columns, 'jobTitle')).toBe('Mathematician');
      expect(cellText(columns, 'department')).toBe('Research');
      expect(cellText(columns, 'primaryCity')).toBe('London');
    });

    it('links email and phone without navigating the row', async () => {
      const columns: ColumnId[] = ['primaryEmail', 'primaryPhone'];
      renderGrid({
        columns,
        items: [anItem({ primaryEmail: 'ada@example.com', primaryPhone: '+44 20 7946 0000' })],
      });
      const table = within(screen.getByRole('table'));

      const email = table.getByRole('link', { name: 'ada@example.com' });
      const phone = table.getByRole('link', { name: '+44 20 7946 0000' });
      expect(email.getAttribute('href')).toBe('mailto:ada@example.com');
      expect(phone.getAttribute('href')).toBe('tel:+44 20 7946 0000');

      await fireEvent.click(email);
      await fireEvent.click(phone);
      expect(navigation.goto).not.toHaveBeenCalled();
    });

    it('leaves email and phone cells empty when missing', () => {
      const columns: ColumnId[] = ['primaryEmail', 'primaryPhone'];
      renderGrid({ columns, items: [anItem()] });

      expect(cellText(columns, 'primaryEmail')).toBe('');
      expect(cellText(columns, 'primaryPhone')).toBe('');
    });

    it('shows a star only for favorites', () => {
      const columns: ColumnId[] = ['displayName', 'isFavorite'];
      renderGrid({
        columns,
        items: [anItem({ isFavorite: true }), anItem({ displayName: 'Grace Hopper' })],
      });
      const [favorite, other] = bodyRows();

      expect(within(favorite).queryAllByRole('img')).toHaveLength(1);
      expect(within(other).queryAllByRole('img')).toHaveLength(0);
    });

    it('formats created and updated dates', () => {
      const columns: ColumnId[] = ['createdAt', 'updatedAt'];
      renderGrid({
        columns,
        items: [
          anItem({ createdAt: '2026-01-15T12:00:00.000Z', updatedAt: '2026-03-02T12:00:00.000Z' }),
        ],
      });

      expect(cellText(columns, 'createdAt')).toBe('Jan 15, 2026');
      expect(cellText(columns, 'updatedAt')).toBe('Mar 2, 2026');
    });

    it('leaves date cells empty when the dates are missing', () => {
      const columns: ColumnId[] = ['createdAt', 'birthday'];
      renderGrid({ columns, items: [anItem()] });

      expect(cellText(columns, 'createdAt')).toBe('');
      expect(cellText(columns, 'birthday')).toBe('');
    });

    it('shows circles', () => {
      const columns: ColumnId[] = ['displayName', 'circles'];
      renderGrid({
        columns,
        items: [anItem({ circles: [{ id: 'c1', name: 'Family', color: '#ff0000' }] })],
      });

      expect(cellText(columns, 'circles')).toContain('Family');
    });
  });

  describe('birthday column', () => {
    const columns: ColumnId[] = ['displayName', 'birthday'];

    it.each([
      ['iso', '1815-12-10'],
      ['us', '12/10'],
      ['eu', '10.12.'],
      ['long', 'Dec 10'],
    ] as const)('formats a birthday in %s format', (birthdayFormat, expected) => {
      renderGrid({ columns, birthdayFormat, items: [anItem({ birthday: '1815-12-10' })] });

      expect(cellText(columns, 'birthday')).toBe(expected);
    });
  });

  describe('sorting', () => {
    const columns: ColumnId[] = ['avatar', 'displayName', 'createdAt', 'updatedAt', 'circles'];

    it('reverses the order when the current sort column is clicked', async () => {
      const { onSortChange } = renderGrid({ columns, sortBy: 'display_name', sortOrder: 'asc' });

      await fireEvent.click(within(header('Name')).getByRole('button'));

      expect(onSortChange).toHaveBeenCalledWith('display_name', 'desc');
    });

    it('switches back to ascending from descending', async () => {
      const { onSortChange } = renderGrid({ columns, sortBy: 'display_name', sortOrder: 'desc' });

      await fireEvent.click(within(header('Name')).getByRole('button'));

      expect(onSortChange).toHaveBeenCalledWith('display_name', 'asc');
    });

    it.each([
      ['Added', 'created_at'],
      ['Updated', 'updated_at'],
    ])('sorts ascending by %s when a new column is clicked', async (name, field) => {
      const { onSortChange } = renderGrid({ columns, sortBy: 'display_name', sortOrder: 'desc' });

      await fireEvent.click(within(header(name)).getByRole('button'));

      expect(onSortChange).toHaveBeenCalledWith(field, 'asc');
    });

    it('offers no sort button on columns the API cannot sort by', () => {
      renderGrid({ columns: ['displayName', 'circles', 'primaryCountry'] });

      expect(within(header('Circles')).queryByRole('button')).toBeNull();
      expect(within(header('Country')).queryByRole('button')).toBeNull();
    });

    it('marks only the current sort column, and the mark follows the order', () => {
      const { unmount } = render(FriendGrid, {
        items: [],
        columns,
        sortBy: 'created_at',
        sortOrder: 'asc',
        birthdayFormat: 'iso',
        onSortChange: vi.fn(),
      });
      const ascending = within(header('Added')).getByRole('img').innerHTML;
      expect(within(header('Name')).queryByRole('img')).toBeNull();
      unmount();

      render(FriendGrid, {
        items: [],
        columns,
        sortBy: 'created_at',
        sortOrder: 'desc',
        birthdayFormat: 'iso',
        onSortChange: vi.fn(),
      });

      expect(within(header('Added')).getByRole('img').innerHTML).not.toBe(ascending);
    });
  });

  describe('navigation', () => {
    it('opens the friend when the row is clicked', async () => {
      renderGrid({ items: [anItem({ id: 'friend-42' })] });

      await fireEvent.click(bodyRows()[0]);

      expect(navigation.goto).toHaveBeenCalledWith('/friends/friend-42');
    });

    it('carries the return URL in row clicks and links', async () => {
      renderGrid({ items: [anItem({ id: 'friend-42' })], returnUrl: '/friends?q=ada&page=2' });
      const expected = `/friends/friend-42?from=${encodeURIComponent('/friends?q=ada&page=2')}`;

      expect(
        within(screen.getByRole('table'))
          .getByRole('link', { name: 'Ada Lovelace' })
          .getAttribute('href'),
      ).toBe(expected);
      expect(within(screen.getByRole('list')).getByRole('link').getAttribute('href')).toBe(
        expected,
      );

      await fireEvent.click(bodyRows()[0]);
      expect(navigation.goto).toHaveBeenCalledWith(expected);
    });

    it('lets the name link navigate on its own', async () => {
      renderGrid({ items: [anItem({ id: 'friend-42' })] });

      await fireEvent.click(
        within(screen.getByRole('table')).getByRole('link', { name: 'Ada Lovelace' }),
      );

      expect(navigation.goto).not.toHaveBeenCalled();
    });
  });

  describe('search mode', () => {
    it('adds a match column with the match source badge', () => {
      renderGrid({
        isSearchMode: true,
        items: [anItem({ matchSource: 'email' }), anItem({ matchSource: 'friend' })],
      });

      expect(header('Match')).toBeTruthy();
      const [byEmail, byName] = bodyRows();
      expect(within(byEmail).getByText('Email')).toBeTruthy();
      expect(within(byName).queryByText('Email')).toBeNull();
    });

    it('shows the headline with only the highlight markup kept', () => {
      renderGrid({
        isSearchMode: true,
        items: [anItem({ headline: 'met at <mark>Babbage</mark><script>alert(1)</script>' })],
      });

      const marks = document.querySelectorAll('mark');
      // One in the table, one in the card.
      expect(marks).toHaveLength(2);
      expect(marks[0].textContent).toBe('Babbage');
      expect(document.querySelector('script')).toBeNull();
    });

    it('hides match column and headline outside search mode', () => {
      renderGrid({ items: [anItem({ matchSource: 'email', headline: '<mark>Babbage</mark>' })] });
      const table = within(screen.getByRole('table'));

      expect(table.queryByRole('columnheader', { name: 'Match' })).toBeNull();
      expect(table.queryByText('Email')).toBeNull();
      expect(screen.queryByText('Babbage')).toBeNull();
    });
  });

  describe('cards', () => {
    function card() {
      return within(screen.getByRole('list'));
    }

    it('shows name, contact details and circles', () => {
      renderGrid({
        items: [
          anItem({
            primaryEmail: 'ada@example.com',
            primaryPhone: '+44 20 7946 0000',
            circles: [{ id: 'c1', name: 'Family', color: '#ff0000' }],
          }),
        ],
      });

      expect(card().getByRole('heading', { name: 'Ada Lovelace' })).toBeTruthy();
      expect(card().getByText('ada@example.com')).toBeTruthy();
      expect(card().getByText('+44 20 7946 0000')).toBeTruthy();
      expect(card().getByText('Family')).toBeTruthy();
    });

    it.each([
      [
        { jobTitle: 'Mathematician', organization: 'Analytical Society' },
        'Mathematician at Analytical Society',
      ],
      [{ jobTitle: 'Mathematician' }, 'Mathematician'],
      [{ organization: 'Analytical Society' }, 'Analytical Society'],
    ])('describes the work as %o', (work, expected) => {
      renderGrid({ items: [anItem(work)] });

      expect(card().getByText(expected)).toBeTruthy();
    });

    it('marks favorites, archived friends and search matches', () => {
      renderGrid({
        isSearchMode: true,
        items: [
          anItem({
            isFavorite: true,
            archivedAt: '2026-01-01T00:00:00.000Z',
            matchSource: 'notes',
            headline: '<mark>engine</mark>',
          }),
          anItem({ displayName: 'Grace Hopper' }),
        ],
      });
      const [marked, plain] = card()
        .getAllByRole('listitem')
        .map((item) => within(item));

      // The favorite star is one image more than the plain card's chevron.
      expect(marked.getAllByRole('img')).toHaveLength(plain.getAllByRole('img').length + 1);
      expect(marked.getByText('Archived')).toBeTruthy();
      expect(marked.getByText('Notes')).toBeTruthy();
      expect(marked.getByText('engine')).toBeTruthy();
      expect(plain.queryByText('Archived')).toBeNull();
      expect(plain.queryByText('Notes')).toBeNull();
    });
  });
});
