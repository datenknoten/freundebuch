<script lang="ts">
import Plus from 'svelte-heros-v2/Plus.svelte';
import CollectiveList from '$lib/components/collectives/collective-list.svelte';
import { Button, PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('collectives.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="list"
  title={$i18n.t('collectives.title')}
  subtitle={$i18n.t('collectives.subtitle')}
>
  {#snippet actions()}
    <Button
      href="/collectives/new"
      data-shortcut="n o"
      data-shortcut-label="shortcuts.newCollective"
    >
      <Plus class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('collectives.createNew')}
    </Button>
  {/snippet}

  <CollectiveList />
</PageShell>
