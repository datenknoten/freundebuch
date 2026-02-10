<script lang="ts">
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { isOpenCollectiveModeActive, openCollectiveModePrefix } from '$lib/stores/ui';
import type { CollectiveListItem } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';
import KeyboardHintBadge from '../KeyboardHintBadge.svelte';

const i18n = createI18n();

interface Props {
  items: CollectiveListItem[];
  sortBy: 'name' | 'created_at' | 'member_count';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'created_at' | 'member_count', sortOrder: 'asc' | 'desc') => void;
}

let { items, sortBy, sortOrder, onSortChange }: Props = $props();

type ColumnDef = {
  id: string;
  label: string;
  sortField?: 'name' | 'created_at' | 'member_count';
  width?: string;
};

let columns = $derived<ColumnDef[]>([
  { id: 'name', label: $i18n.t('collectives.columnName'), sortField: 'name' },
  { id: 'type', label: $i18n.t('collectives.columnType') },
  {
    id: 'members',
    label: $i18n.t('collectives.columnMembers'),
    sortField: 'member_count',
    width: '140px',
  },
  { id: 'memberPreview', label: '', width: '120px' },
  {
    id: 'createdAt',
    label: $i18n.t('collectives.columnCreated'),
    sortField: 'created_at',
    width: '140px',
  },
]);

function handleRowClick(itemId: string) {
  goto(`/collectives/${itemId}`);
}

function handleSort(column: ColumnDef) {
  if (!column.sortField) return;

  if (sortBy === column.sortField) {
    onSortChange(column.sortField, sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    onSortChange(column.sortField, 'asc');
  }
}

// Icon mapping for collective types
function getTypeIcon(typeName: string): string {
  switch (typeName.toLowerCase()) {
    case 'family':
      return 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6';
    case 'company':
      return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
    case 'club':
      return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
    case 'friend group':
      return 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
    default:
      return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
  }
}

function getTypeBadgeColor(typeName: string): string {
  switch (typeName.toLowerCase()) {
    case 'family':
      return 'bg-rose-100 text-rose-800';
    case 'company':
      return 'bg-blue-100 text-blue-800';
    case 'club':
      return 'bg-green-100 text-green-800';
    case 'friend group':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<!-- Desktop: Table view -->
<div class="hidden md:block overflow-x-auto pl-6">
  <table class="w-full">
    <thead>
      <tr class="border-b border-gray-200">
        {#each columns as column}
          <th
            class="py-3 px-3 text-left"
            style={column.width ? `width: ${column.width}` : undefined}
          >
            {#if column.sortField}
              <button
                type="button"
                onclick={() => handleSort(column)}
                class="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-forest transition-colors font-body"
              >
                {column.label}
                {#if sortBy === column.sortField}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {#if sortOrder === 'asc'}
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    {:else}
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    {/if}
                  </svg>
                {/if}
              </button>
            {:else if column.label}
              <span class="text-sm font-semibold text-gray-700 font-body">{column.label}</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each items as item, index (item.id)}
        <tr
          onclick={() => handleRowClick(item.id)}
          onkeydown={(e) => e.key === 'Enter' && handleRowClick(item.id)}
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
          class:opacity-60={item.deletedAt}
          tabindex="0"
          role="link"
          aria-label="View {item.name}"
        >
          <!-- Name -->
          <td class="py-2 px-3 relative">
            <KeyboardHintBadge {index} isActive={$isOpenCollectiveModeActive} prefix={$openCollectiveModePrefix} variant="table-row" />
            <span class="font-body text-gray-900 font-medium">{item.name}</span>
          </td>

          <!-- Type -->
          <td class="py-2 px-3">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body font-medium {getTypeBadgeColor(item.type.name)}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTypeIcon(item.type.name)} />
              </svg>
              {item.type.name}
            </span>
          </td>

          <!-- Member count -->
          <td class="py-2 px-3">
            <span class="font-body text-gray-600 text-sm">
              {item.activeMemberCount}
              {#if item.memberCount !== item.activeMemberCount}
                <span class="text-gray-400">/ {item.memberCount}</span>
              {/if}
            </span>
          </td>

          <!-- Member preview -->
          <td class="py-2 px-3">
            {#if item.memberPreview.length > 0}
              <div class="flex -space-x-2">
                {#each item.memberPreview.slice(0, 3) as member (member.id)}
                  <div class="ring-2 ring-white rounded-full">
                    <FriendAvatar
                      displayName={member.displayName}
                      photoUrl={member.photoUrl}
                      size="sm"
                    />
                  </div>
                {/each}
                {#if item.memberCount > 3}
                  <div class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 ring-2 ring-white text-xs text-gray-500 font-body">
                    +{item.memberCount - 3}
                  </div>
                {/if}
              </div>
            {/if}
          </td>

          <!-- Created -->
          <td class="py-2 px-3">
            <span class="font-body text-gray-600 text-sm">{formatDate(item.createdAt)}</span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<!-- Mobile: Card view -->
<div class="md:hidden space-y-2" role="list" aria-label="Collectives">
  {#each items as item, index (item.id)}
    <a
      href="/collectives/{item.id}"
      class="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-forest hover:shadow-sm transition-all relative"
      class:opacity-60={item.deletedAt}
      data-sveltekit-preload-data="tap"
    >
      <KeyboardHintBadge {index} isActive={$isOpenCollectiveModeActive} prefix={$openCollectiveModePrefix} variant="card" />

      <!-- Type icon as avatar stand-in -->
      <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center {getTypeBadgeColor(item.type.name)}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTypeIcon(item.type.name)} />
        </svg>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-heading text-lg text-gray-900 truncate">
            {item.name}
          </h3>
          <div class="flex items-center gap-2 shrink-0">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body font-medium {getTypeBadgeColor(item.type.name)}">
              {item.type.name}
            </span>
            {#if item.deletedAt}
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{$i18n.t('collectives.deleted')}</span>
            {/if}
          </div>
        </div>

        <div class="flex items-center gap-3 mt-1 text-sm text-gray-500 font-body">
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {item.activeMemberCount} {$i18n.t(item.activeMemberCount === 1 ? 'collectives.member' : 'collectives.members')}
          </span>
        </div>

        {#if item.memberPreview.length > 0}
          <div class="mt-2 flex items-center gap-1">
            <div class="flex -space-x-2">
              {#each item.memberPreview.slice(0, 3) as member (member.id)}
                <div class="ring-2 ring-white rounded-full">
                  <FriendAvatar
                    displayName={member.displayName}
                    photoUrl={member.photoUrl}
                    size="sm"
                  />
                </div>
              {/each}
            </div>
            {#if item.memberCount > 3}
              <span class="ml-2 text-xs text-gray-500 font-body">
                {$i18n.t('collectives.memberCountMore', { count: item.memberCount - 3 })}
              </span>
            {/if}
          </div>
        {/if}
      </div>

      <svg
        class="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </a>
  {/each}
</div>
