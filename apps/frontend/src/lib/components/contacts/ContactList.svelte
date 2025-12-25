<script lang="ts">
import { contactList, contacts, isContactsLoading } from '$lib/stores/contacts';
import ContactListItem from './ContactListItem.svelte';

let sortBy = $state<'display_name' | 'created_at' | 'updated_at'>('display_name');
let sortOrder = $state<'asc' | 'desc'>('asc');

async function loadPage(page: number) {
  await contacts.loadContacts({
    page,
    pageSize: $contacts.pageSize,
    sortBy,
    sortOrder,
  });
}

async function handleSortChange() {
  await loadPage(1);
}

function toggleSortOrder() {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  handleSortChange();
}
</script>

<div class="space-y-4">
  <!-- Header with sorting controls -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="text-sm text-gray-600 font-body">
      {$contacts.total} contact{$contacts.total !== 1 ? 's' : ''}
    </div>

    <div class="flex items-center gap-2">
      <label for="sort-by" class="text-sm text-gray-600 font-body">Sort by:</label>
      <select
        id="sort-by"
        bind:value={sortBy}
        onchange={handleSortChange}
        class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-body focus:ring-2 focus:ring-forest focus:border-transparent"
      >
        <option value="display_name">Name</option>
        <option value="created_at">Date Added</option>
        <option value="updated_at">Last Updated</option>
      </select>

      <button
        onclick={toggleSortOrder}
        class="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {#if sortOrder === 'asc'}
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        {:else}
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Loading state -->
  {#if $isContactsLoading}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
    </div>
  {:else if $contactList.length === 0}
    <!-- Empty state -->
    <div class="text-center py-12 bg-gray-50 rounded-lg">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h3 class="mt-4 text-lg font-heading text-gray-900">No contacts yet</h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        Get started by adding your first contact.
      </p>
      <a
        href="/contacts/new"
        class="mt-4 inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Contact
      </a>
    </div>
  {:else}
    <!-- Contact list -->
    <div class="space-y-2">
      {#each $contactList as contact (contact.id)}
        <ContactListItem {contact} />
      {/each}
    </div>

    <!-- Pagination -->
    {#if $contacts.totalPages > 1}
      <div class="flex items-center justify-between pt-4 border-t border-gray-200">
        <div class="text-sm text-gray-600 font-body">
          Page {$contacts.page} of {$contacts.totalPages}
        </div>

        <div class="flex gap-2">
          <button
            onclick={() => loadPage($contacts.page - 1)}
            disabled={$contacts.page <= 1}
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-body hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onclick={() => loadPage($contacts.page + 1)}
            disabled={$contacts.page >= $contacts.totalPages}
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-body hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
