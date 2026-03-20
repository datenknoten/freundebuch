<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import AppPasswordManager from '$lib/components/app-password-manager.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.appPasswords.title')} | Freundebuch</title>
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
    <h1 class="text-3xl font-heading text-forest mt-4">{$i18n.t('profile.appPasswords.title')}</h1>
    <p class="text-gray-600 font-body mt-1">{$i18n.t('profile.appPasswords.subtitle')}</p>
  </div>

  <AppPasswordManager />
</div>
