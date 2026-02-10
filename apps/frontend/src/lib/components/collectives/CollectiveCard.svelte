<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { CollectiveListItem } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';

const i18n = createI18n();

interface Props {
  collective: CollectiveListItem;
  href?: string;
}

let { collective, href = `/collectives/${collective.id}` }: Props = $props();

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

// Type badge color based on type name
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

let iconPath = $derived(getTypeIcon(collective.type.name));
let badgeColor = $derived(getTypeBadgeColor(collective.type.name));
</script>

<a
  {href}
  class="block bg-white border border-gray-200 rounded-lg p-4 hover:border-forest hover:shadow-sm transition-all relative"
  class:opacity-60={collective.deletedAt}
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1 min-w-0">
      <!-- Collective name -->
      <h3 class="font-heading font-semibold text-gray-900 truncate">
        {collective.name}
      </h3>

      <!-- Type badge -->
      <div class="mt-2">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body font-medium {badgeColor}">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
          </svg>
          {collective.type.name}
        </span>
      </div>
    </div>

    <!-- Member count badge -->
    <div class="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500 font-body">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span>{collective.activeMemberCount}</span>
      {#if collective.memberCount !== collective.activeMemberCount}
        <span class="text-gray-400">/ {collective.memberCount}</span>
      {/if}
    </div>
  </div>

  <!-- Member avatars preview -->
  {#if collective.memberPreview.length > 0}
    <div class="mt-3 flex items-center gap-1">
      <div class="flex -space-x-2">
        {#each collective.memberPreview.slice(0, 3) as member (member.id)}
          <div class="ring-2 ring-white rounded-full">
            <FriendAvatar
              displayName={member.displayName}
              photoUrl={member.photoUrl}
              size="sm"
            />
          </div>
        {/each}
      </div>
      {#if collective.memberCount > 3}
        <span class="ml-2 text-xs text-gray-500 font-body">
          {$i18n.t('collectives.memberCountMore', { count: collective.memberCount - 3 })}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Deleted indicator -->
  {#if collective.deletedAt}
    <div class="absolute top-2 right-2 text-xs text-gray-500 font-body italic">
      {$i18n.t('collectives.deleted')}
    </div>
  {/if}
</a>
