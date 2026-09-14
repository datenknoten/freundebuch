<script lang="ts">
import Users from 'svelte-heros-v2/Users.svelte';
import { chipClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import {
  collectiveTypeI18nKey,
  getTypeBadgeColor,
  getTypeIconComponent,
} from '$lib/utils/collective-types';
import type { CollectiveListItem } from '$shared';
import FriendAvatar from '../friends/friend-avatar.svelte';

const i18n = createI18n();

interface Props {
  collective: CollectiveListItem;
  href?: string;
}

let { collective, href = `/collectives/${collective.id}` }: Props = $props();

let badgeColor = $derived(getTypeBadgeColor(collective.type.name));
let TypeIcon = $derived(getTypeIconComponent(collective.type.name));
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
        <span class="{chipClasses.base} {badgeColor}">
          <TypeIcon class="w-3 h-3" strokeWidth="2" />
          {$i18n.t(collectiveTypeI18nKey(collective.type.name), { defaultValue: collective.type.name })}
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
