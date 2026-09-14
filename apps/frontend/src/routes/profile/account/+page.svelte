<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import { FormInput } from '$lib/components/ui';
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
    <FormInput
      id="user-id"
      label={$i18n.t('profile.userId')}
      value={$currentUser?.externalId ?? ''}
      helper={$i18n.t('profile.userIdHelp')}
      disabled
    />

    <FormInput
      id="email"
      type="email"
      label={$i18n.t('profile.emailAddress')}
      value={$currentUser?.email ?? ''}
      disabled
    />
  </div>
</div>
