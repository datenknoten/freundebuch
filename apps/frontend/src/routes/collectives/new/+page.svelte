<script lang="ts">
import CollectiveForm from '$lib/components/collectives/CollectiveForm.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('collectives.createNew')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="form"
  title={$i18n.t('collectives.createNew')}
  subtitle={$i18n.t('collectives.createNewSubtitle')}
  back={{ href: '/collectives', label: $i18n.t('collectives.backToCollectives') }}
>
  <CollectiveForm />
</PageShell>
