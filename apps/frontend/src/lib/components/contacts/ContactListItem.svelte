<script lang="ts">
import { isOpenModeActive } from '$lib/stores/ui';
import type { ContactListItem } from '$shared';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  contact: ContactListItem;
  /** Index in the list (0-based), used for keyboard shortcut indicator */
  index?: number;
}

let { contact, index }: Props = $props();

// Only show keyboard hint for first 9 items (keys 1-9)
let showKeyHint = $derived(index !== undefined && index < 9 && $isOpenModeActive);
let keyNumber = $derived(index !== undefined ? index + 1 : null);
</script>

<a
  href="/contacts/{contact.id}"
  class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-forest hover:shadow-sm transition-all relative"
  data-sveltekit-preload-data="tap"
>
  {#if showKeyHint && keyNumber}
    <div class="absolute -left-1 -top-1 w-6 h-6 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
      {keyNumber}
    </div>
  {/if}

  <ContactAvatar
    displayName={contact.displayName}
    photoUrl={contact.photoThumbnailUrl}
    size="md"
  />

  <div class="flex-1 min-w-0">
    <h3 class="font-heading text-lg text-gray-900 truncate">
      {contact.displayName}
    </h3>

    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 font-body">
      {#if contact.primaryEmail}
        <span class="truncate">{contact.primaryEmail}</span>
      {/if}
      {#if contact.primaryPhone}
        <span>{contact.primaryPhone}</span>
      {/if}
    </div>
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
