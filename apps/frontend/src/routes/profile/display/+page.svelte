<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import { FormCheckbox, FormSelect } from '$lib/components/ui';
import { createI18n, languageNames } from '$lib/i18n/index.js';
import { auth, birthdayFormat, showShortcutHints } from '$lib/stores/auth';
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

function handleShortcutHintsChange(enabled: boolean) {
  auth.updatePreferences({ showShortcutHints: enabled });
}

let languageOptions = $derived(
  supportedLanguages.map((lang) => ({ value: lang, label: languageNames[lang] })),
);

let birthdayFormatOptions = $derived([
  { value: 'iso' as BirthdayFormat, label: $i18n.t('profile.preferences.birthdayFormats.iso') },
  { value: 'us' as BirthdayFormat, label: $i18n.t('profile.preferences.birthdayFormats.us') },
  { value: 'eu' as BirthdayFormat, label: $i18n.t('profile.preferences.birthdayFormats.eu') },
  { value: 'long' as BirthdayFormat, label: $i18n.t('profile.preferences.birthdayFormats.long') },
]);
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
    <div class="max-w-xs">
      <FormSelect
        id="language"
        label={$i18n.t('profile.preferences.language')}
        bind:value={() => $currentLanguage, handleLanguageChange}
        options={languageOptions}
      />
    </div>

    <div class="max-w-xs">
      <FormSelect
        id="birthday-format"
        label={$i18n.t('profile.preferences.birthdayFormat')}
        bind:value={() => $birthdayFormat, handleBirthdayFormatChange}
        options={birthdayFormatOptions}
        helper={$i18n.t('profile.preferences.birthdayFormatHelp')}
      />
    </div>

    <div>
      <FormCheckbox
        id="shortcut-hints"
        label={$i18n.t('profile.preferences.shortcutHints')}
        bind:checked={() => $showShortcutHints, handleShortcutHintsChange}
      />
      <p class="mt-1 text-xs font-body text-gray-500 ml-6">
        {$i18n.t('profile.preferences.shortcutHintsHelp')}
      </p>
    </div>
  </div>
</div>
