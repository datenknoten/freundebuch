<script lang="ts">
import {
  getKeyboardHint,
  isOpenEncounterModeActive,
  openEncounterModePrefix,
} from '$lib/stores/ui';
import type { EncounterListItem } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';

interface Props {
  encounter: EncounterListItem;
  href?: string;
  /** Index in the list (for keyboard hints) */
  index?: number;
}

let { encounter, href = `/encounters/${encounter.id}`, index }: Props = $props();

// Keyboard hint logic
function getKeyHint(): string | null {
  if (index === undefined) return null;
  return getKeyboardHint(index);
}

function shouldShowKeyHint(): boolean {
  if (index === undefined || !$isOpenEncounterModeActive) return false;

  const keyHint = getKeyHint();
  if (!keyHint) return false;

  const prefix = $openEncounterModePrefix;

  if (prefix === null) {
    // No prefix selected yet - show all hints
    return true;
  }

  // Prefix selected - only show hints that match this prefix
  return keyHint.length === 2 && keyHint[0] === prefix;
}

let showHint = $derived(shouldShowKeyHint());
let keyHint = $derived(getKeyHint());

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<a
  {href}
  class="block bg-white border border-gray-200 rounded-lg p-4 hover:border-forest hover:shadow-sm transition-all relative"
>
  {#if showHint && keyHint}
    <div class="absolute -left-1 -top-1 min-w-6 h-6 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
      {keyHint}
    </div>
  {/if}
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1 min-w-0">
      <h3 class="font-heading font-semibold text-gray-900 truncate">
        {encounter.title}
      </h3>

      <div class="mt-1 flex items-center gap-2 text-sm text-gray-500 font-body">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatDate(encounter.encounterDate)}</span>
      </div>

      {#if encounter.locationText}
        <div class="mt-1 flex items-center gap-2 text-sm text-gray-500 font-body">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="truncate">{encounter.locationText}</span>
        </div>
      {/if}
    </div>

    <!-- Friend count badge -->
    <div class="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500 font-body">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span>{encounter.friendCount}</span>
    </div>
  </div>

  <!-- Friend avatars preview -->
  {#if encounter.friends.length > 0}
    <div class="mt-3 flex items-center gap-1">
      <div class="flex -space-x-2">
        {#each encounter.friends.slice(0, 3) as friend (friend.id)}
          <div class="ring-2 ring-white rounded-full">
            <FriendAvatar
              displayName={friend.displayName}
              photoUrl={friend.photoUrl}
              size="sm"
            />
          </div>
        {/each}
      </div>
      {#if encounter.friendCount > 3}
        <span class="ml-2 text-xs text-gray-500 font-body">
          +{encounter.friendCount - 3} more
        </span>
      {/if}
    </div>
  {/if}
</a>
