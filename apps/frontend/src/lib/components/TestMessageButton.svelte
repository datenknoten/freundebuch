<script lang="ts">
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import { TRANSIENT_FEEDBACK_MS } from '$lib/utils/timing';

const notificationChannelsApi = getAppContext().api.notificationChannels;
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
    await notificationChannelsApi.testChannel(channelId);
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
