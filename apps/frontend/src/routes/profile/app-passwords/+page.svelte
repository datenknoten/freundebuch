<script lang="ts">
import AppPasswordManager from '$lib/components/app-password-manager.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.appPasswords.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="detail"
  title={$i18n.t('profile.appPasswords.title')}
  subtitle={$i18n.t('profile.appPasswords.subtitle')}
  back={{ href: '/profile', label: $i18n.t('profile.hub.backToProfile') }}
>
  <AppPasswordManager />
</PageShell>
