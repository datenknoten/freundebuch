<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { page } from '$app/stores';
import FriendForm from '$lib/components/friends/friend-form.svelte';
import { Button, EmptyState, PageShell } from '$lib/components/ui';
import Spinner from '$lib/components/ui/spinner.svelte';
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

<PageShell
  width="form"
  title={$currentFriend === null ? undefined : 'Edit Friend'}
  subtitle={$currentFriend === null
    ? undefined
    : `Update ${$currentFriend.displayName}'s information`}
  back={{ href: `/friends/${$page.params.id}`, label: 'Back to Friend' }}
>
  {#if $isFriendsLoading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if $currentFriend}
    <FriendForm friend={$currentFriend} />
  {:else if $friends.error}
    <EmptyState
      icon={ExclamationTriangle}
      tone="error"
      title="Friend not found"
      description={$friends.error}
    >
      <Button variant="secondary" href="/friends">Return to friends</Button>
    </EmptyState>
  {/if}
</PageShell>
