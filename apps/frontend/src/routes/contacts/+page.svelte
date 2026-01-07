<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import ContactList from '$lib/components/contacts/ContactList.svelte';
import { isAuthInitialized } from '$lib/stores/auth';
import { contacts } from '$lib/stores/contacts';

let hasLoaded = $state(false);

// Get initial query from URL
let initialQuery = $derived($page.url.searchParams.get('q') ?? '');

// Handle query changes from the ContactList component
function handleQueryChange(query: string) {
  const url = new URL($page.url);

  if (query.trim()) {
    url.searchParams.set('q', query.trim());
  } else {
    url.searchParams.delete('q');
  }

  // Update URL without navigation (replaceState)
  goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
}

// Load contacts when auth is ready
$effect(() => {
  if ($isAuthInitialized && !hasLoaded) {
    hasLoaded = true;
    contacts.loadContacts();
  }
});
</script>

<svelte:head>
  <title>{initialQuery ? `Search: ${initialQuery}` : 'Contacts'} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-4xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-heading text-forest">Friends</h1>
          <p class="text-gray-600 font-body mt-1">Manage your personal and professional contacts</p>
        </div>
        <a
          href="/contacts/new"
          class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </a>
      </div>

      <ContactList {initialQuery} onQueryChange={handleQueryChange} />
    </div>
  </div>
</div>
