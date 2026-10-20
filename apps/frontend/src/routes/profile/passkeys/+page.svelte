<script lang="ts">
import PasskeyManager from '$lib/components/PasskeyManager.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.passkeys.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="detail"
  title={$i18n.t('profile.passkeys.title')}
  subtitle={$i18n.t('profile.passkeys.subtitle')}
  back={{ href: '/profile', label: $i18n.t('profile.hub.backToProfile') }}
>
  <PasskeyManager />
</PageShell>
