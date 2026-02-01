<script lang="ts">
import EncounterList from '$lib/components/encounters/EncounterList.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('encounters.title')} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-heading text-forest">{$i18n.t('encounters.title')}</h1>
          <p class="text-gray-600 font-body mt-1">{$i18n.t('encounters.subtitle')}</p>
        </div>
        <a
          href="/encounters/new"
          class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('encounters.logNew')}
        </a>
      </div>

      <EncounterList />
    </div>
  </div>
</div>
