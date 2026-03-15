<script lang="ts">
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
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
        <Calendar class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
        <span>{formatDate(encounter.encounterDate)}</span>
      </div>

      {#if encounter.locationText}
        <div class="mt-1 flex items-center gap-2 text-sm text-gray-500 font-body">
          <MapPin class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
          <span class="truncate">{encounter.locationText}</span>
        </div>
      {/if}
    </div>

    <!-- Friend count badge -->
    <div class="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500 font-body">
      <Users class="w-4 h-4" strokeWidth="2" />
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
