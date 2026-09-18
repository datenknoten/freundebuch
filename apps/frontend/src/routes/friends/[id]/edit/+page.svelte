<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { page } from '$app/stores';
import FriendForm from '$lib/components/friends/friend-form.svelte';
import { Button, EmptyState, PageShell } from '$lib/components/ui';
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
  $currentFriend === null
    ? $i18n.t('friends.editFriend')
    : $i18n.t('friends.editFriendTitle', { name: $currentFriend.displayName }),
);
</script>

<svelte:head>
  <title>{pageTitle} | Freundebuch</title>
</svelte:head>

<PageShell
  width="form"
  title={$currentFriend === null ? undefined : $i18n.t('friends.editFriend')}
  subtitle={$currentFriend === null
    ? undefined
    : $i18n.t('friends.editFriendSubtitle', { name: $currentFriend.displayName })}
  back={{ href: `/friends/${$page.params.id}`, label: $i18n.t('friends.backToFriend') }}
>
  <!-- Spin only while there is nothing to edit: every store action flips
       `isFriendsLoading`, and swapping the form out mid-action would take any
       open dialog (and the form's own state) with it. -->
  {#if $isFriendsLoading && $currentFriend === null}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if $currentFriend}
    <FriendForm friend={$currentFriend} />
  {:else if $friends.error}
    <EmptyState
      icon={ExclamationTriangle}
      tone="error"
      title={$i18n.t('friends.friendNotFound')}
      description={$friends.error}
    >
      <Button variant="secondary" href="/friends">{$i18n.t('friends.returnToFriends')}</Button>
    </EmptyState>
  {/if}
</PageShell>
