<script lang="ts">
import { page } from '$app/stores';
import FriendForm from '$lib/components/friends/FriendForm.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();

// Check if the friend should be added to a collective after creation (from URL params)
function collectiveContextFromUrl() {
  const collectiveId = $page.url.searchParams.get('collectiveId');
  const collectiveName = $page.url.searchParams.get('collectiveName');

  if (
    collectiveId !== null &&
    collectiveId !== '' &&
    collectiveName !== null &&
    collectiveName !== ''
  ) {
    return {
      id: collectiveId,
      name: collectiveName,
      roleId: $page.url.searchParams.get('roleId') ?? undefined,
    };
  }
  return undefined;
}
let collectiveContext = $derived.by<{ id: string; name: string; roleId?: string } | undefined>(
  collectiveContextFromUrl,
);

// A friend created from a collective returns to that collective, everyone else
// to the friends list.
let back = $derived(
  collectiveContext === undefined
    ? { href: '/friends', label: $i18n.t('friends.backToFriends') }
    : {
        href: `/collectives/${collectiveContext.id}`,
        label: $i18n.t('friends.backToCollective', { name: collectiveContext.name }),
      },
);
let subtitle = $derived(
  collectiveContext === undefined
    ? $i18n.t('friends.newFriendSubtitle')
    : $i18n.t('friends.newFriendForCollective', { name: collectiveContext.name }),
);
</script>

<svelte:head>
  <title>{$i18n.t('friends.newFriend')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="form"
  title={$i18n.t('friends.newFriend')}
  {subtitle}
  {back}
>
  <FriendForm addToCollective={collectiveContext} />
</PageShell>
