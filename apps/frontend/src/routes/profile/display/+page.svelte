<script lang="ts">
import AlertBanner from '$lib/components/alert-banner.svelte';
import { FormCheckbox, FormSelect, PageShell } from '$lib/components/ui';
import { createI18n, languageNames } from '$lib/i18n/index.js';
import { auth, birthdayFormat, defaultCountry, showShortcutHints } from '$lib/stores/auth';
import {
  currentLanguage,
  locale,
  type SupportedLanguage,
  supportedLanguages,
} from '$lib/stores/locale';
import { type BirthdayFormat, listCountries, type UserPreferences } from '$shared';

const i18n = createI18n();

let saved = $state(false);

async function persistPreferences(newPreferences: Partial<UserPreferences>) {
  saved = false;
  try {
    await auth.updatePreferences(newPreferences);
    saved = true;
  } catch {
    // The store retries with backoff and then gives up: no confirmation to show.
  }
}

function handleBirthdayFormatChange(format: BirthdayFormat) {
  void persistPreferences({ birthdayFormat: format });
}

function handleLanguageChange(lang: SupportedLanguage) {
  // The interface switching language is its own confirmation, and the store
  // swallows persistence failures, so there is nothing to confirm here.
  saved = false;
  void locale.setLanguage(lang);
}

function handleDefaultCountryChange(code: string) {
  void persistPreferences({ defaultCountry: code === '' ? null : code });
}

function handleShortcutHintsChange(enabled: boolean) {
  void persistPreferences({ showShortcutHints: enabled });
}

let languageOptions = $derived(
  supportedLanguages.map((lang) => ({ value: lang, label: languageNames[lang] })),
);

let countryOptions = $derived(
  listCountries($currentLanguage).map((c) => ({ value: c.code, label: c.name })),
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

<PageShell
  width="detail"
  title={$i18n.t('profile.hub.cards.display.title')}
  subtitle={$i18n.t('profile.hub.cards.display.description')}
  back={{ href: '/profile', label: $i18n.t('profile.hub.backToProfile') }}
>
  {#if saved}
    <div class="mb-4">
      <AlertBanner variant="success">{$i18n.t('profile.display.saved')}</AlertBanner>
    </div>
  {/if}

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

    <div class="max-w-xs">
      <FormSelect
        id="default-country"
        label={$i18n.t('profile.preferences.defaultCountry')}
        bind:value={() => $defaultCountry ?? '', handleDefaultCountryChange}
        options={countryOptions}
        placeholderOption={$i18n.t('profile.preferences.defaultCountryNone')}
        helper={$i18n.t('profile.preferences.defaultCountryHelp')}
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
</PageShell>
