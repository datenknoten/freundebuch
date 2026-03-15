<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
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
        <ChevronLeft class="w-4 h-4" strokeWidth="2" />
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
          <ExclamationTriangle class="mx-auto h-12 w-12 text-red-400" strokeWidth="2" />
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
