<script lang="ts">
import CardDAVSetupGuide from '$lib/components/card-dav-setup-guide.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

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
