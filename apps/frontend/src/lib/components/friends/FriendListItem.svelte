<script lang="ts">
import CircleChips from '$lib/components/circles/CircleChips.svelte';
import FavoriteButton from '$lib/components/circles/FavoriteButton.svelte';
import { getKeyboardHint, isOpenModeActive, openModePrefix } from '$lib/stores/ui';
import type { FriendListItem } from '$shared';
import FriendAvatar from './FriendAvatar.svelte';

interface Props {
  friend: FriendListItem;
  /** Index in the list (0-based), used for keyboard shortcut indicator */
  index?: number;
}

let { friend, index }: Props = $props();

// Get the keyboard hint for this item
let keyHint = $derived(index !== undefined ? getKeyboardHint(index) : null);

// Determine if we should show the hint based on current open mode state
let showKeyHint = $derived(() => {
  if (index === undefined || !$isOpenModeActive || !keyHint) return false;

  const prefix = $openModePrefix;

  if (prefix === null) {
    // No prefix selected yet - show all hints
    return true;
  }

  // Prefix selected - only show hints that match this prefix
  // e.g., if prefix is 'a', only show a1, a2, ... a9
  return keyHint.length === 2 && keyHint[0] === prefix;
});
</script>

<a
  href="/friends/{friend.id}"
  class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-forest hover:shadow-sm transition-all relative"
  data-sveltekit-preload-data="tap"
>
  {#if showKeyHint() && keyHint}
    <div class="absolute -left-1 -top-1 min-w-6 h-6 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
      {keyHint}
    </div>
  {/if}

  <FriendAvatar
    displayName={friend.displayName}
    photoUrl={friend.photoThumbnailUrl}
    size="md"
  />

  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <h3 class="font-heading text-lg text-gray-900 truncate">
        {friend.displayName}
      </h3>
      {#if friend.isFavorite}
        <FavoriteButton isFavorite={true} size="sm" disabled />
      {/if}
      {#if friend.archivedAt}
        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Archived</span>
      {/if}
    </div>

    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 font-body">
      {#if friend.primaryEmail}
        <span class="truncate">{friend.primaryEmail}</span>
      {/if}
      {#if friend.primaryPhone}
        <span>{friend.primaryPhone}</span>
      {/if}
    </div>

    {#if friend.circles && friend.circles.length > 0}
      <div class="mt-1">
        <CircleChips circles={friend.circles} size="sm" maxVisible={3} />
      </div>
    {/if}
  </div>

  <svg
    class="w-5 h-5 text-gray-400 flex-shrink-0"
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
