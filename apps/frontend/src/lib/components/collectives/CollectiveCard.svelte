<script lang="ts">
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Home from 'svelte-heros-v2/Home.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { createI18n } from '$lib/i18n/index.js';
import type { CollectiveListItem } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';

const i18n = createI18n();

interface Props {
  collective: CollectiveListItem;
  href?: string;
}

let { collective, href = `/collectives/${collective.id}` }: Props = $props();

// Icon component mapping for collective types
function getTypeIconComponent(typeName: string): typeof Home {
  switch (typeName.toLowerCase()) {
    case 'family':
      return Home;
    case 'company':
      return BuildingOffice;
    case 'club':
      return Users;
    case 'friend group':
      return Heart;
    default:
      return Users;
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
          <svelte:component this={getTypeIconComponent(collective.type.name)} class="w-3 h-3" strokeWidth="2" />
          {collective.type.name}
        </span>
      </div>
    </div>

    <!-- Member count badge -->
    <div class="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500 font-body">
      <Users class="w-4 h-4" strokeWidth="2" />
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
