<script lang="ts">
import { page } from '$app/stores';
import FriendDetail from '$lib/components/friends/FriendDetail.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isAuthInitialized } from '$lib/stores/auth';
import { currentFriend, friends, isFriendsLoading } from '$lib/stores/friends';

const i18n = createI18n();

// Load friend when auth is ready and page params change
$effect(() => {
  const id = $page.params.id;
  if ($isAuthInitialized && id) {
    friends.loadFriend(id);
  }
});

// Dynamic page title based on friend name
const pageTitle = $derived(
  $currentFriend ? `${$currentFriend.displayName} | Freundebuch` : 'Friend | Freundebuch',
);

// Get return URL from query parameter (with security validation)
const backUrl = $derived.by(() => {
  const from = $page.url.searchParams.get('from');
  // Only allow returning to /friends paths for security
  if (from?.startsWith('/friends')) {
    return from;
  }
  return '/friends';
});
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <a
        href={backUrl}
        class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1 mb-6"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {$i18n.t('friends.backToFriends')}
      </a>

      {#if $isFriendsLoading && !$currentFriend}
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
        </div>
      {:else if $currentFriend}
        <FriendDetail friend={$currentFriend} />
      {:else if $friends.error}
        <div class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-heading text-gray-900">{$i18n.t('friends.friendNotFound')}</h3>
          <p class="mt-2 text-sm text-gray-600 font-body">
            {$friends.error}
          </p>
          <a
            href={backUrl}
            class="mt-4 inline-flex items-center gap-2 text-forest font-body font-semibold hover:text-forest-light"
          >
            {$i18n.t('friends.returnToFriends')}
          </a>
        </div>
      {/if}
    </div>
  </div>
</div>
