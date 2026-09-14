<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { page } from '$app/stores';
import FriendDetail from '$lib/components/friends/friend-detail.svelte';
import { Button, EmptyState } from '$lib/components/ui';
import Spinner from '$lib/components/ui/spinner.svelte';
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
          <Spinner size="lg" />
        </div>
      {:else if $currentFriend}
        <FriendDetail friend={$currentFriend} />
      {:else if $friends.error}
        <EmptyState
          icon={ExclamationTriangle}
          tone="error"
          title={$i18n.t('friends.friendNotFound')}
          description={$friends.error}
        >
          <Button variant="secondary" href={backUrl}>{$i18n.t('friends.returnToFriends')}</Button>
        </EmptyState>
      {/if}
    </div>
  </div>
</div>
