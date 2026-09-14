<script lang="ts">
import * as channelsApi from '$lib/api/notification-channels';
import Button from '$lib/components/ui/button.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

interface Props {
  channelId: string;
}

let { channelId }: Props = $props();

let isLoading = $state(false);
let result = $state<'success' | 'error' | null>(null);

async function handleTest() {
  isLoading = true;
  result = null;
  try {
    await channelsApi.testChannel(channelId);
    result = 'success';
    setTimeout(() => {
      result = null;
    }, 5000);
  } catch {
    result = 'error';
    setTimeout(() => {
      result = null;
    }, 5000);
  } finally {
    isLoading = false;
  }
}
</script>

<span class="inline-flex items-center gap-2">
  <Button variant="ghostAccent" size="sm" onclick={handleTest} disabled={isLoading}>
    {#if isLoading}
      {$i18n.t('profile.messagingReminders.test.sending')}
    {:else}
      {$i18n.t('profile.messagingReminders.test.button')}
    {/if}
  </Button>
  {#if result === 'success'}
    <span class="text-sm text-green-600 font-body">{$i18n.t('profile.messagingReminders.test.success')}</span>
  {:else if result === 'error'}
    <span class="text-sm text-red-600 font-body">{$i18n.t('profile.messagingReminders.test.failure')}</span>
  {/if}
</span>
