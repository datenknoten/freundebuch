<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { page } from '$app/stores';
import FriendForm from '$lib/components/friends/FriendForm.svelte';
import { isAuthInitialized } from '$lib/stores/auth';
import { currentFriend, friends, isFriendsLoading } from '$lib/stores/friends';

// Load friend when auth is ready and page params change
$effect(() => {
  const id = $page.params.id;
  if ($isAuthInitialized && id) {
    friends.loadFriend(id);
  }
});

// Dynamic page title based on friend name
const pageTitle = $derived(
  $currentFriend ? `Edit ${$currentFriend.displayName} | Freundebuch` : 'Edit Friend | Freundebuch',
);
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <a
        href="/friends/{$page.params.id}"
        class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1 mb-6"
      >
        <ChevronLeft class="w-4 h-4" strokeWidth="2" />
        Back to Friend
      </a>

      {#if $isFriendsLoading}
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
        </div>
      {:else if $currentFriend}
        <div class="mb-8">
          <h1 class="text-3xl font-heading text-forest">Edit Friend</h1>
          <p class="text-gray-600 font-body mt-1">Update {$currentFriend.displayName}'s information</p>
        </div>

        <FriendForm friend={$currentFriend} />
      {:else if $friends.error}
        <div class="text-center py-12">
          <ExclamationTriangle class="mx-auto h-12 w-12 text-red-400" strokeWidth="2" />
          <h3 class="mt-4 text-lg font-heading text-gray-900">Friend not found</h3>
          <p class="mt-2 text-sm text-gray-600 font-body">
            {$friends.error}
          </p>
          <a
            href="/friends"
            class="mt-4 inline-flex items-center gap-2 text-forest font-body font-semibold hover:text-forest-light"
          >
            Return to friends
          </a>
        </div>
      {/if}
    </div>
  </div>
</div>
