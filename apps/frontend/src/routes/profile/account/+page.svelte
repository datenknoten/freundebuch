<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.hub.cards.account.title')} | Freundebuch</title>
</svelte:head>

<div class="bg-white rounded-xl shadow-lg p-8">
  <div class="mb-8">
    <a
      href="/profile"
      class="inline-flex items-center gap-2 text-gray-600 hover:text-forest font-body text-sm transition-colors"
    >
      <ChevronLeft class="w-4 h-4" strokeWidth="2" />
      {$i18n.t('profile.hub.backToProfile')}
    </a>
    <div class="mt-4">
      <h1 class="text-3xl font-heading text-forest">{$i18n.t('profile.hub.cards.account.title')}</h1>
      <p class="text-gray-600 font-body mt-1">{$i18n.t('profile.hub.cards.account.description')}</p>
    </div>
  </div>

  <div class="space-y-6">
    <div>
      <label for="user-id" class="block text-sm font-body font-semibold text-gray-700 mb-2">
        {$i18n.t('profile.userId')}
      </label>
      <input
        type="text"
        id="user-id"
        value={$currentUser?.externalId || ''}
        disabled
        class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-body text-gray-600"
      />
      <p class="mt-1 text-xs font-body text-gray-500">{$i18n.t('profile.userIdHelp')}</p>
    </div>

    <div>
      <label for="email" class="block text-sm font-body font-semibold text-gray-700 mb-2">
        {$i18n.t('profile.emailAddress')}
      </label>
      <input
        type="email"
        id="email"
        value={$currentUser?.email || ''}
        disabled
        class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-body text-gray-600"
      />
    </div>
  </div>
</div>
