<script lang="ts">
import { goto } from '$app/navigation';
import { getKeyboardHint, isOpenModeActive, openModePrefix } from '$lib/stores/ui';
import type { ContactListItem } from '$shared';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  contacts: ContactListItem[];
  sortBy: 'display_name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  onSortChange: (
    sortBy: 'display_name' | 'created_at' | 'updated_at',
    sortOrder: 'asc' | 'desc',
  ) => void;
}

let { contacts, sortBy, sortOrder, onSortChange }: Props = $props();

function handleRowClick(contactId: string) {
  goto(`/contacts/${contactId}`);
}

function handleLinkClick(e: MouseEvent) {
  // Prevent row navigation when clicking email/phone links
  e.stopPropagation();
}

function handleSort(column: 'display_name') {
  if (sortBy === column) {
    // Toggle sort order
    onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    // New column, default to ascending
    onSortChange(column, 'asc');
  }
}

function getKeyHint(index: number): string | null {
  return getKeyboardHint(index);
}

function shouldShowKeyHint(index: number): boolean {
  if (!$isOpenModeActive) return false;

  const keyHint = getKeyHint(index);
  if (!keyHint) return false;

  const prefix = $openModePrefix;

  if (prefix === null) {
    // No prefix selected yet - show all hints
    return true;
  }

  // Prefix selected - only show hints that match this prefix
  return keyHint.length === 2 && keyHint[0] === prefix;
}
</script>

<div class="overflow-x-auto">
  <table class="w-full">
    <thead>
      <tr class="border-b border-gray-200">
        <!-- Avatar column - no header -->
        <th class="w-12 py-3 px-2"></th>

        <!-- Name column - sortable -->
        <th class="py-3 px-3 text-left">
          <button
            type="button"
            onclick={() => handleSort('display_name')}
            class="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-forest transition-colors font-body"
          >
            Name
            {#if sortBy === 'display_name'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {#if sortOrder === 'asc'}
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                {:else}
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                {/if}
              </svg>
            {/if}
          </button>
        </th>

        <!-- Email column - not sortable -->
        <th class="py-3 px-3 text-left">
          <span class="text-sm font-semibold text-gray-700 font-body">Email</span>
        </th>

        <!-- Phone column - not sortable -->
        <th class="py-3 px-3 text-left">
          <span class="text-sm font-semibold text-gray-700 font-body">Phone</span>
        </th>
      </tr>
    </thead>
    <tbody>
      {#each contacts as contact, index (contact.id)}
        {@const keyHint = getKeyHint(index)}
        {@const showHint = shouldShowKeyHint(index)}
        <tr
          onclick={() => handleRowClick(contact.id)}
          onkeydown={(e) => e.key === 'Enter' && handleRowClick(contact.id)}
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
          tabindex="0"
          role="link"
          aria-label="View {contact.displayName}"
        >
          <!-- Avatar -->
          <td class="py-2 px-2 relative">
            {#if showHint && keyHint}
              <div class="absolute -left-1 -top-0 min-w-5 h-5 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
                {keyHint}
              </div>
            {/if}
            <ContactAvatar
              displayName={contact.displayName}
              photoUrl={contact.photoThumbnailUrl}
              size="sm"
            />
          </td>

          <!-- Name -->
          <td class="py-2 px-3">
            <span class="font-body text-gray-900">{contact.displayName}</span>
          </td>

          <!-- Email -->
          <td class="py-2 px-3">
            {#if contact.primaryEmail}
              <a
                href="mailto:{contact.primaryEmail}"
                onclick={handleLinkClick}
                class="font-body text-gray-600 hover:text-forest hover:underline transition-colors"
              >
                {contact.primaryEmail}
              </a>
            {/if}
          </td>

          <!-- Phone -->
          <td class="py-2 px-3">
            {#if contact.primaryPhone}
              <a
                href="tel:{contact.primaryPhone}"
                onclick={handleLinkClick}
                class="font-body text-gray-600 hover:text-forest hover:underline transition-colors"
              >
                {contact.primaryPhone}
              </a>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
