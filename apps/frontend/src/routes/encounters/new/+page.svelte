<script lang="ts">
import { page } from '$app/stores';
import EncounterForm from '$lib/components/encounters/EncounterForm.svelte';
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

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-2xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="mb-8">
        <a
          href="/encounters"
          class="inline-flex items-center gap-2 text-gray-600 hover:text-forest font-body text-sm transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {$i18n.t('encounters.backToEncounters')}
        </a>
        <h1 class="text-3xl font-heading text-forest mt-4">{$i18n.t('encounters.logNew')}</h1>
        <p class="text-gray-600 font-body mt-1">{$i18n.t('encounters.logNewSubtitle')}</p>
      </div>

      <EncounterForm {preSelectedFriend} />
    </div>
  </div>
</div>
