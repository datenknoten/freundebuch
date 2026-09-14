<script lang="ts">
import { page } from '$app/stores';
import EncounterForm from '$lib/components/encounters/encounter-form.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { FriendSearchResult } from '$shared';

const i18n = createI18n();

// Check if there's a pre-selected friend from URL params
let preSelectedFriend = $derived.by<FriendSearchResult | undefined>(() => {
  const friendId = $page.url.searchParams.get('friendId');
  const friendName = $page.url.searchParams.get('friendName');

  if (friendId && friendName) {
    return {
      id: friendId,
      displayName: friendName,
      photoThumbnailUrl: null,
    };
  }
  return undefined;
});
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
