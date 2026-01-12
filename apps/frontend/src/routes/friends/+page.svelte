<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
// biome-ignore lint/style/useImportType: FriendList is used both as type and value (bind:this)
import FriendList from '$lib/components/friends/FriendList.svelte';
import { friendsPageSize, isAuthInitialized } from '$lib/stores/auth';
import { friends } from '$lib/stores/friends';

let hasLoaded = $state(false);
let friendListRef = $state<FriendList | null>(null);

// Get initial query from URL
let initialQuery = $derived($page.url.searchParams.get('q') ?? '');

// Handle query changes from the FriendList component
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

// Load friends when auth is ready
$effect(() => {
  if ($isAuthInitialized && !hasLoaded) {
    hasLoaded = true;
    friends.loadFriends({ pageSize: $friendsPageSize });
  }
});

// Listen for keyboard shortcuts for pagination
onMount(() => {
  function handlePreviousPage() {
    friendListRef?.goToPreviousPage();
  }

  function handleNextPage() {
    friendListRef?.goToNextPage();
  }

  window.addEventListener('shortcut:previous-page', handlePreviousPage);
  window.addEventListener('shortcut:next-page', handleNextPage);

  return () => {
    window.removeEventListener('shortcut:previous-page', handlePreviousPage);
    window.removeEventListener('shortcut:next-page', handleNextPage);
  };
});
</script>

<svelte:head>
  <title>{initialQuery ? `Search: ${initialQuery}` : 'Friends'} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-heading text-forest">Friends</h1>
          <p class="text-gray-600 font-body mt-1">Manage your personal and professional friends</p>
        </div>
        <a
          href="/friends/new"
          class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Friend
        </a>
      </div>

      <FriendList bind:this={friendListRef} {initialQuery} onQueryChange={handleQueryChange} />
    </div>
  </div>
</div>
