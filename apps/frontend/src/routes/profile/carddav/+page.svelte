<script lang="ts">
import CardDAVSetupGuide from '$lib/components/CardDavSetupGuide.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.carddav.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="detail"
  title={$i18n.t('profile.carddav.title')}
  subtitle={$i18n.t('profile.carddav.subtitle')}
  back={{ href: '/profile', label: $i18n.t('profile.hub.backToProfile') }}
>
  <CardDAVSetupGuide />
</PageShell>
