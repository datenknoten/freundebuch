<script lang="ts">
import { getKeyboardHint, isOpenModeActive, openModePrefix } from '$lib/stores/ui';
import type { GlobalSearchResult } from '$shared';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  result: GlobalSearchResult;
  /** Index in the list (0-based), used for keyboard shortcut indicator */
  index?: number;
}

let { result, index }: Props = $props();

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
  href="/contacts/{result.id}"
  class="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-forest hover:shadow-sm transition-all relative"
  data-sveltekit-preload-data="tap"
>
  {#if showKeyHint() && keyHint}
    <div class="absolute -left-1 -top-1 min-w-6 h-6 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
      {keyHint}
    </div>
  {/if}

  <ContactAvatar
    displayName={result.displayName}
    photoUrl={result.photoThumbnailUrl}
    size="md"
  />

  <div class="flex-1 min-w-0">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-heading text-lg text-gray-900 truncate">
        {result.displayName}
      </h3>
      {#if result.matchSource && result.matchSource !== 'contact'}
        <span class="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full {
          result.matchSource === 'email' ? 'bg-blue-100 text-blue-700' :
          result.matchSource === 'phone' ? 'bg-green-100 text-green-700' :
          'bg-purple-100 text-purple-700'
        }">
          {result.matchSource}
        </span>
      {/if}
    </div>

    {#if result.organization || result.jobTitle}
      <div class="font-body text-sm text-gray-600 truncate">
        {#if result.jobTitle && result.organization}
          {result.jobTitle} at {result.organization}
        {:else if result.jobTitle}
          {result.jobTitle}
        {:else if result.organization}
          {result.organization}
        {/if}
      </div>
    {/if}

    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 font-body mt-1">
      {#if result.primaryEmail}
        <span class="truncate">{result.primaryEmail}</span>
      {/if}
      {#if result.primaryPhone}
        <span>{result.primaryPhone}</span>
      {/if}
    </div>

    {#if result.headline && result.matchSource}
      <div class="mt-2 font-body text-sm text-gray-600 line-clamp-2 search-headline">
        {@html result.headline}
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

<style>
  /* Style for highlighted search terms from ts_headline */
  .search-headline :global(mark) {
    background-color: rgb(254 249 195); /* yellow-100 */
    color: rgb(17 24 39); /* gray-900 */
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
