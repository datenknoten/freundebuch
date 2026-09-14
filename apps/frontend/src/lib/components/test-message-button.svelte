<script lang="ts">
import * as channelsApi from '$lib/api/notification-channels';
import AlertBanner from '$lib/components/alert-banner.svelte';
import Button from '$lib/components/ui/button.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { TRANSIENT_FEEDBACK_MS } from '$lib/utils/timing';

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
  } catch {
    result = 'error';
  } finally {
    isLoading = false;
  }
  setTimeout(() => {
    result = null;
  }, TRANSIENT_FEEDBACK_MS);
}
</script>

<div class="inline-flex items-center gap-2">
  <Button variant="ghostAccent" size="sm" onclick={handleTest} disabled={isLoading}>
    {#if isLoading}
      {$i18n.t('profile.messagingReminders.test.sending')}
    {:else}
      {$i18n.t('profile.messagingReminders.test.button')}
    {/if}
  </Button>
  {#if result === 'success'}
    <AlertBanner variant="success">{$i18n.t('profile.messagingReminders.test.success')}</AlertBanner>
  {:else if result === 'error'}
    <AlertBanner variant="error">{$i18n.t('profile.messagingReminders.test.failure')}</AlertBanner>
  {/if}
</div>
