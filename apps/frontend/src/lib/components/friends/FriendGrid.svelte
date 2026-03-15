<script lang="ts">
import DOMPurify from 'isomorphic-dompurify';
import ChevronRight from 'svelte-heros-v2/ChevronRight.svelte';
import ChevronUp from 'svelte-heros-v2/ChevronUp.svelte';
import Star from 'svelte-heros-v2/Star.svelte';
import { goto } from '$app/navigation';
import { isOpenModeActive, openModePrefix } from '$lib/stores/ui';
import {
  type BirthdayFormat,
  COLUMN_DEFINITIONS,
  type ColumnId,
  type FriendGridItem,
} from '$shared';
import CircleChips from '../circles/CircleChips.svelte';
import KeyboardHintBadge from '../KeyboardHintBadge.svelte';
import FriendAvatar from './FriendAvatar.svelte';

/** Sanitize search headline HTML to only allow <mark> tags for highlighting */
function sanitizeHeadline(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark'] });
}

interface Props {
  items: FriendGridItem[];
  columns: ColumnId[];
  sortBy: 'display_name' | 'created_at' | 'updated_at' | 'relevance';
  sortOrder: 'asc' | 'desc';
  birthdayFormat: BirthdayFormat;
  /** Whether we're in search mode (shows relevance sort option and match source) */
  isSearchMode?: boolean;
  /** Current page URL path with search params (for return navigation) */
  returnUrl?: string;
  onSortChange: (
    sortBy: 'display_name' | 'created_at' | 'updated_at',
    sortOrder: 'asc' | 'desc',
  ) => void;
}

let {
  items,
  columns,
  sortBy,
  sortOrder,
  birthdayFormat,
  isSearchMode = false,
  returnUrl,
  onSortChange,
}: Props = $props();

function getFriendDetailUrl(itemId: string): string {
  const baseUrl = `/friends/${itemId}`;
  if (returnUrl) {
    return `${baseUrl}?from=${encodeURIComponent(returnUrl)}`;
  }
  return baseUrl;
}

function handleRowClick(itemId: string) {
  goto(getFriendDetailUrl(itemId));
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

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
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

function getCellValue(item: FriendGridItem, columnId: ColumnId): string | undefined {
  switch (columnId) {
    case 'displayName':
      return item.displayName;
    case 'nickname':
      return item.nickname;
    case 'organization':
      return item.organization;
    case 'jobTitle':
      return item.jobTitle;
    case 'department':
      return item.department;
    case 'primaryCity':
      return item.primaryCity;
    case 'primaryCountry':
      return item.primaryCountry;
    case 'primaryEmail':
      return item.primaryEmail;
    case 'primaryPhone':
      return item.primaryPhone;
    default:
      return undefined;
  }
}

function getMatchSourceBadge(
  matchSource: FriendGridItem['matchSource'],
): { class: string; label: string } | null {
  if (!matchSource || matchSource === 'friend') return null;

  switch (matchSource) {
    case 'email':
      return { class: 'bg-blue-100 text-blue-700', label: 'email' };
    case 'phone':
      return { class: 'bg-green-100 text-green-700', label: 'phone' };
    case 'notes':
      return { class: 'bg-purple-100 text-purple-700', label: 'notes' };
    default:
      return null;
  }
}
</script>

<!-- Desktop: Table view -->
<div class="hidden md:block overflow-x-auto pl-6">
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
                  <ChevronUp class="w-4 h-4" strokeWidth="2" />
                {/if}
              </button>
            {:else}
              <span class="text-sm font-semibold text-gray-700 font-body">{definition.label}</span>
            {/if}
          </th>
        {/each}
        {#if isSearchMode}
          <th class="py-3 px-3 text-left w-24">
            <span class="text-sm font-semibold text-gray-700 font-body">Match</span>
          </th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each items as item, index (item.id)}
        {@const matchBadge = getMatchSourceBadge(item.matchSource)}
        <tr
          onclick={() => handleRowClick(item.id)}
          onkeydown={(e) => e.key === 'Enter' && handleRowClick(item.id)}
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
          tabindex="0"
          role="link"
          aria-label="View {item.displayName}"
        >
          {#each columns as columnId}
            <td
              class="py-2 px-3"
              class:px-2={columnId === 'avatar'}
              class:relative={columnId === 'avatar'}
            >
              {#if columnId === 'avatar'}
                <!-- Avatar with keyboard hint -->
                <KeyboardHintBadge {index} isActive={$isOpenModeActive} prefix={$openModePrefix} variant="table-row" />
                <FriendAvatar
                  displayName={item.displayName}
                  photoUrl={item.photoThumbnailUrl}
                  size="sm"
                />
              {:else if columnId === 'displayName'}
                <span class="font-body text-gray-900">{item.displayName}</span>
              {:else if columnId === 'circles'}
                <CircleChips circles={item.circles} size="sm" maxVisible={2} />
              {:else if columnId === 'primaryEmail'}
                {#if item.primaryEmail}
                  <a
                    href="mailto:{item.primaryEmail}"
                    onclick={handleLinkClick}
                    class="font-body text-gray-600 hover:text-forest hover:underline transition-colors"
                  >
                    {item.primaryEmail}
                  </a>
                {/if}
              {:else if columnId === 'primaryPhone'}
                {#if item.primaryPhone}
                  <a
                    href="tel:{item.primaryPhone}"
                    onclick={handleLinkClick}
                    class="font-body text-gray-600 hover:text-forest hover:underline transition-colors"
                  >
                    {item.primaryPhone}
                  </a>
                {/if}
              {:else if columnId === 'birthday'}
                <span class="font-body text-gray-600">{formatBirthday(item.birthday, birthdayFormat)}</span>
              {:else if columnId === 'isFavorite'}
                {#if item.isFavorite}
                  <Star class="w-5 h-5 text-amber-500" strokeWidth="2" />
                {/if}
              {:else if columnId === 'createdAt'}
                <span class="font-body text-gray-600 text-sm">{formatDate(item.createdAt)}</span>
              {:else if columnId === 'updatedAt'}
                <span class="font-body text-gray-600 text-sm">{formatDate(item.updatedAt)}</span>
              {:else}
                <!-- Text columns: nickname, organization, jobTitle, department, primaryCity, primaryCountry -->
                {@const value = getCellValue(item, columnId)}
                {#if value}
                  <span class="font-body text-gray-600">{value}</span>
                {/if}
              {/if}
            </td>
          {/each}
          {#if isSearchMode}
            <td class="py-2 px-3">
              {#if matchBadge}
                <span class="px-2 py-0.5 text-xs font-medium rounded-full {matchBadge.class}">
                  {matchBadge.label}
                </span>
              {/if}
            </td>
          {/if}
        </tr>
        {#if isSearchMode && item.headline}
          <tr class="bg-gray-50/50">
            <td colspan={columns.length + 1} class="py-1 px-3 pl-16">
              <div class="font-body text-sm text-gray-600 line-clamp-2 search-headline">
                {@html sanitizeHeadline(item.headline)}
              </div>
            </td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
</div>

<!-- Mobile: Card view -->
<div class="md:hidden space-y-2" role="list" aria-label="Friends">
  {#each items as item, index (item.id)}
    {@const matchBadge = getMatchSourceBadge(item.matchSource)}
    <a
      href={getFriendDetailUrl(item.id)}
      class="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-forest hover:shadow-sm transition-all relative"
      data-sveltekit-preload-data="tap"
    >
      <KeyboardHintBadge {index} isActive={$isOpenModeActive} prefix={$openModePrefix} variant="card" />

      <FriendAvatar
        displayName={item.displayName}
        photoUrl={item.photoThumbnailUrl}
        size="md"
      />

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-heading text-lg text-gray-900 truncate">
            {item.displayName}
          </h3>
          <div class="flex items-center gap-2 shrink-0">
            {#if item.isFavorite}
              <Star class="w-4 h-4 text-amber-500" strokeWidth="2" />
            {/if}
            {#if item.archivedAt}
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Archived</span>
            {/if}
            {#if matchBadge}
              <span class="px-2 py-0.5 text-xs font-medium rounded-full {matchBadge.class}">
                {matchBadge.label}
              </span>
            {/if}
          </div>
        </div>

        {#if item.organization || item.jobTitle}
          <div class="font-body text-sm text-gray-600 truncate">
            {#if item.jobTitle && item.organization}
              {item.jobTitle} at {item.organization}
            {:else if item.jobTitle}
              {item.jobTitle}
            {:else if item.organization}
              {item.organization}
            {/if}
          </div>
        {/if}

        <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 font-body mt-1">
          {#if item.primaryEmail}
            <span class="truncate">{item.primaryEmail}</span>
          {/if}
          {#if item.primaryPhone}
            <span>{item.primaryPhone}</span>
          {/if}
        </div>

        {#if isSearchMode && item.headline}
          <div class="mt-2 font-body text-sm text-gray-600 line-clamp-2 search-headline">
            {@html sanitizeHeadline(item.headline)}
          </div>
        {/if}

        {#if item.circles && item.circles.length > 0}
          <div class="mt-2">
            <CircleChips circles={item.circles} size="sm" maxVisible={3} />
          </div>
        {/if}
      </div>

      <ChevronRight class="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" strokeWidth="2" />
    </a>
  {/each}
</div>

<style>
  /* Style for highlighted search terms from ts_headline */
  .search-headline :global(mark) {
    background-color: rgb(254 249 195); /* yellow-100 */
    color: rgb(17 24 39); /* gray-900 */
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
