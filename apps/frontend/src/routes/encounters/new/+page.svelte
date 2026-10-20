<script lang="ts">
import { page } from '$app/stores';
import EncounterForm from '$lib/components/encounters/EncounterForm.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { FriendSearchResultResponse } from '$shared';

const i18n = createI18n();

// A friend may be pre-selected via URL params (e.g. from a friend's detail page).
function preSelectedFriendFromUrl() {
  const friendId = $page.url.searchParams.get('friendId');
  const friendName = $page.url.searchParams.get('friendName');

  if (friendId !== null && friendId !== '' && friendName !== null && friendName !== '') {
    return {
      id: friendId,
      displayName: friendName,
    };
  }
  return undefined;
}
let preSelectedFriend = $derived.by<FriendSearchResultResponse | undefined>(
  preSelectedFriendFromUrl,
);
</script>

<svelte:head>
  <title>{$i18n.t('encounters.logNew')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="form"
  title={$i18n.t('encounters.logNew')}
  subtitle={$i18n.t('encounters.logNewSubtitle')}
  back={{ href: '/encounters', label: $i18n.t('encounters.backToEncounters') }}
>
  <EncounterForm {preSelectedFriend} />
</PageShell>
