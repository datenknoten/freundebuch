<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import { page } from '$app/stores';
import FriendForm from '$lib/components/friends/friend-form.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

// Check if the friend should be added to a collective after creation (from URL params)
let collectiveContext = $derived.by<{ id: string; name: string; roleId?: string } | undefined>(
  () => {
    const collectiveId = $page.url.searchParams.get('collectiveId');
    const collectiveName = $page.url.searchParams.get('collectiveName');

    if (collectiveId && collectiveName) {
      return {
        id: collectiveId,
        name: collectiveName,
        roleId: $page.url.searchParams.get('roleId') ?? undefined,
      };
    }
    return undefined;
  },
);
</script>

<svelte:head>
  <title>{$i18n.t('friends.newFriend')} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="mb-8">
        {#if collectiveContext}
          <a
            href={`/collectives/${collectiveContext.id}`}
            class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1 mb-4"
          >
            <ChevronLeft class="w-4 h-4" strokeWidth="2" />
            {$i18n.t('friends.backToCollective', { name: collectiveContext.name })}
          </a>
        {:else}
          <a
            href="/friends"
            class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1 mb-4"
          >
            <ChevronLeft class="w-4 h-4" strokeWidth="2" />
            {$i18n.t('friends.backToFriends')}
          </a>
        {/if}
        <h1 class="text-3xl font-heading text-forest">{$i18n.t('friends.newFriend')}</h1>
        <p class="text-gray-600 font-body mt-1">
          {#if collectiveContext}
            {$i18n.t('friends.newFriendForCollective', { name: collectiveContext.name })}
          {:else}
            {$i18n.t('friends.newFriendSubtitle')}
          {/if}
        </p>
      </div>

      <FriendForm addToCollective={collectiveContext} />
    </div>
  </div>
</div>
