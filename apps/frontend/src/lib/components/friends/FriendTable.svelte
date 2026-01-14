<script lang="ts">
import { goto } from '$app/navigation';
import { getKeyboardHint, isOpenModeActive, openModePrefix } from '$lib/stores/ui';
import {
  type BirthdayFormat,
  COLUMN_DEFINITIONS,
  type ColumnId,
  type FriendListItem,
} from '$shared';
import CircleChips from '../circles/CircleChips.svelte';
import FriendAvatar from './FriendAvatar.svelte';

interface Props {
  friends: FriendListItem[];
  columns: ColumnId[];
  sortBy: 'display_name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  birthdayFormat: BirthdayFormat;
  onSortChange: (
    sortBy: 'display_name' | 'created_at' | 'updated_at',
    sortOrder: 'asc' | 'desc',
  ) => void;
}

let { friends, columns, sortBy, sortOrder, birthdayFormat, onSortChange }: Props = $props();

function handleRowClick(friendId: string) {
  goto(`/friends/${friendId}`);
}

function handleLinkClick(e: MouseEvent) {
  // Prevent row navigation when clicking email/phone links
  e.stopPropagation();
}

function handleSort(column: ColumnId) {
  // Only allow sorting on sortable columns
  const definition = COLUMN_DEFINITIONS[column];
  if (!definition.sortable) return;

  // Map column ID to sort field
  const sortField = mapColumnToSortBy(column);
  if (!sortField) return;

  if (sortBy === sortField) {
    // Toggle sort order
    onSortChange(sortField, sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    // New column, default to ascending
    onSortChange(sortField, 'asc');
  }
}

function mapColumnToSortBy(
  columnId: ColumnId,
): 'display_name' | 'created_at' | 'updated_at' | null {
  switch (columnId) {
    case 'displayName':
      return 'display_name';
    case 'createdAt':
      return 'created_at';
    case 'updatedAt':
      return 'updated_at';
    default:
      return null;
  }
}

function getKeyHint(index: number): string | null {
  return getKeyboardHint(index);
}

function shouldShowKeyHint(index: number): boolean {
  if (!$isOpenModeActive) return false;

  const keyHint = getKeyHint(index);
  if (!keyHint) return false;

  const prefix = $openModePrefix;

  if (prefix === null) {
    // No prefix selected yet - show all hints
    return true;
  }

  // Prefix selected - only show hints that match this prefix
  return keyHint.length === 2 && keyHint[0] === prefix;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatBirthday(dateString: string | undefined, format: BirthdayFormat): string {
  if (!dateString) return '';
  // Birthday is stored as YYYY-MM-DD
  const [year, month, day] = dateString.split('-');
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);

  switch (format) {
    case 'iso':
      return dateString; // YYYY-MM-DD
    case 'us':
      return `${month}/${day}`; // MM/DD
    case 'eu':
      return `${day}.${month}.`; // DD.MM.
    case 'long': {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${monthNames[monthNum - 1]} ${dayNum}`; // May 15
    }
    default:
      return dateString;
  }
}

function getCellValue(friend: FriendListItem, columnId: ColumnId): string | undefined {
  switch (columnId) {
    case 'displayName':
      return friend.displayName;
    case 'nickname':
      return friend.nickname;
    case 'organization':
      return friend.organization;
    case 'jobTitle':
      return friend.jobTitle;
    case 'department':
      return friend.department;
    case 'primaryCity':
      return friend.primaryCity;
    case 'primaryCountry':
      return friend.primaryCountry;
    case 'primaryEmail':
      return friend.primaryEmail;
    case 'primaryPhone':
      return friend.primaryPhone;
    default:
      return undefined;
  }
}
</script>

<div class="overflow-x-auto pl-6">
  <table class="w-full">
    <thead>
      <tr class="border-b border-gray-200">
        {#each columns as columnId}
          {@const definition = COLUMN_DEFINITIONS[columnId]}
          {@const sortField = mapColumnToSortBy(columnId)}
          {@const isSortable = definition.sortable && sortField !== null}
          {@const isCurrentSort = sortBy === sortField}
          <th
            class="py-3 px-3 text-left"
            class:w-14={columnId === 'avatar'}
            class:px-2={columnId === 'avatar'}
            style={definition.defaultWidth ? `width: ${definition.defaultWidth}` : undefined}
          >
            {#if columnId === 'avatar'}
              <!-- Empty header for avatar -->
            {:else if isSortable}
              <button
                type="button"
                onclick={() => handleSort(columnId)}
                class="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-forest transition-colors font-body"
              >
                {definition.label}
                {#if isCurrentSort}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {#if sortOrder === 'asc'}
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    {:else}
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    {/if}
                  </svg>
                {/if}
              </button>
            {:else}
              <span class="text-sm font-semibold text-gray-700 font-body">{definition.label}</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each friends as friend, index (friend.id)}
        {@const keyHint = getKeyHint(index)}
        {@const showHint = shouldShowKeyHint(index)}
        <tr
          onclick={() => handleRowClick(friend.id)}
          onkeydown={(e) => e.key === 'Enter' && handleRowClick(friend.id)}
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
          tabindex="0"
          role="link"
          aria-label="View {friend.displayName}"
        >
          {#each columns as columnId}
            <td
              class="py-2 px-3"
              class:px-2={columnId === 'avatar'}
              class:relative={columnId === 'avatar'}
            >
              {#if columnId === 'avatar'}
                <!-- Avatar with keyboard hint -->
                {#if showHint && keyHint}
                  <div class="absolute -left-6 top-1/2 -translate-y-1/2 min-w-5 h-5 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
                    {keyHint}
                  </div>
                {/if}
                <FriendAvatar
                  displayName={friend.displayName}
                  photoUrl={friend.photoThumbnailUrl}
                  size="sm"
                />
              {:else if columnId === 'displayName'}
                <span class="font-body text-gray-900">{friend.displayName}</span>
              {:else if columnId === 'circles'}
                <CircleChips circles={friend.circles} size="sm" maxVisible={2} />
              {:else if columnId === 'primaryEmail'}
                {#if friend.primaryEmail}
                  <a
                    href="mailto:{friend.primaryEmail}"
                    onclick={handleLinkClick}
                    class="font-body text-gray-600 hover:text-forest hover:underline transition-colors"
                  >
                    {friend.primaryEmail}
                  </a>
                {/if}
              {:else if columnId === 'primaryPhone'}
                {#if friend.primaryPhone}
                  <a
                    href="tel:{friend.primaryPhone}"
                    onclick={handleLinkClick}
                    class="font-body text-gray-600 hover:text-forest hover:underline transition-colors"
                  >
                    {friend.primaryPhone}
                  </a>
                {/if}
              {:else if columnId === 'birthday'}
                <span class="font-body text-gray-600">{formatBirthday(friend.birthday, birthdayFormat)}</span>
              {:else if columnId === 'isFavorite'}
                {#if friend.isFavorite}
                  <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Favorite">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                {/if}
              {:else if columnId === 'createdAt'}
                <span class="font-body text-gray-600 text-sm">{formatDate(friend.createdAt)}</span>
              {:else if columnId === 'updatedAt'}
                <span class="font-body text-gray-600 text-sm">{formatDate(friend.updatedAt)}</span>
              {:else}
                <!-- Text columns: nickname, organization, jobTitle, department, primaryCity, primaryCountry -->
                {@const value = getCellValue(friend, columnId)}
                {#if value}
                  <span class="font-body text-gray-600">{value}</span>
                {/if}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
