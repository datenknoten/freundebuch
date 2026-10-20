<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { page } from '$app/stores';
import { getAppContext } from '$lib/app-context.js';
import FriendDetail from '$lib/components/friends/FriendDetail.svelte';
import Button from '$lib/components/ui/Button.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const friends = getAppContext().stores.friends;
const currentFriend = friends.currentFriend;
const isFriendsLoading = friends.isLoading;
const isAuthInitialized = getAppContext().stores.auth.isInitialized;

const i18n = createI18n();

// Reload when auth is ready and whenever the page params change.
function loadFriendWhenAuthReady() {
  const id = $page.params.id;
  if ($isAuthInitialized === true && id !== undefined && id !== '') {
    void friends.loadFriend(id);
  }
}
$effect(loadFriendWhenAuthReady);

const pageTitle = $derived(
  $currentFriend !== null ? `${$currentFriend.displayName} | Freundebuch` : 'Friend | Freundebuch',
);

function backUrlFromQuery() {
  const from = $page.url.searchParams.get('from');
  // Only allow returning to /friends paths for security
  if (from?.startsWith('/friends') === true) {
    return from;
  }
  return '/friends';
}
const backUrl = $derived.by(backUrlFromQuery);
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<PageShell
  width="detail"
  back={{ href: backUrl, label: $i18n.t('friends.backToFriends') }}
>
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
</PageShell>
