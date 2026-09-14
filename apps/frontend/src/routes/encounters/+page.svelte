<script lang="ts">
import Plus from 'svelte-heros-v2/Plus.svelte';
import EncounterList from '$lib/components/encounters/encounter-list.svelte';
import { Button, PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('encounters.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="list"
  title={$i18n.t('encounters.title')}
  subtitle={$i18n.t('encounters.subtitle')}
>
  {#snippet actions()}
    <Button
      href="/encounters/new"
      data-shortcut="n e"
      data-shortcut-label="shortcuts.newEncounter"
    >
      <Plus class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('encounters.logNew')}
    </Button>
  {/snippet}

  <EncounterList />
</PageShell>
