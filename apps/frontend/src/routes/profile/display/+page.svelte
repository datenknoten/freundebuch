<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import { createI18n, languageNames } from '$lib/i18n/index.js';
import { auth, birthdayFormat } from '$lib/stores/auth';
import {
  currentLanguage,
  locale,
  type SupportedLanguage,
  supportedLanguages,
} from '$lib/stores/locale';
import type { BirthdayFormat } from '$shared';

const i18n = createI18n();

function handleBirthdayFormatChange(format: BirthdayFormat) {
  auth.updatePreferences({ birthdayFormat: format });
}

function handleLanguageChange(lang: SupportedLanguage) {
  locale.setLanguage(lang);
}
</script>

<svelte:head>
  <title>{$i18n.t('profile.hub.cards.display.title')} | Freundebuch</title>
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
    <h1 class="text-3xl font-heading text-forest mt-4">{$i18n.t('profile.hub.cards.display.title')}</h1>
    <p class="text-gray-600 font-body mt-1">{$i18n.t('profile.hub.cards.display.description')}</p>
  </div>

  <div class="space-y-4">
    <div>
      <label for="language" class="block text-sm font-body font-semibold text-gray-700 mb-2">
        {$i18n.t('profile.preferences.language')}
      </label>
      <select
        id="language"
        value={$currentLanguage}
        onchange={(e) => handleLanguageChange(e.currentTarget.value as SupportedLanguage)}
        class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
      >
        {#each supportedLanguages as lang}
          <option value={lang}>{languageNames[lang]}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="birthday-format" class="block text-sm font-body font-semibold text-gray-700 mb-2">
        {$i18n.t('profile.preferences.birthdayFormat')}
      </label>
      <select
        id="birthday-format"
        value={$birthdayFormat}
        onchange={(e) => handleBirthdayFormatChange(e.currentTarget.value as BirthdayFormat)}
        class="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
      >
        <option value="iso">{$i18n.t('profile.preferences.birthdayFormats.iso')}</option>
        <option value="us">{$i18n.t('profile.preferences.birthdayFormats.us')}</option>
        <option value="eu">{$i18n.t('profile.preferences.birthdayFormats.eu')}</option>
        <option value="long">{$i18n.t('profile.preferences.birthdayFormats.long')}</option>
      </select>
      <p class="mt-1 text-xs font-body text-gray-500">
        {$i18n.t('profile.preferences.birthdayFormatHelp')}
      </p>
    </div>
  </div>
</div>
