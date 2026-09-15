<script lang="ts">
import { Button, ConfirmDialog } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { NotificationChannel } from '$shared';
import TestMessageButton from './test-message-button.svelte';

const i18n = createI18n();

interface Props {
  channel: NotificationChannel;
  ontoggle: (channelId: string, isEnabled: boolean) => void;
  onedit: (channel: NotificationChannel) => void;
  ondelete: (channelId: string) => void;
}

let { channel, ontoggle, onedit, ondelete }: Props = $props();

/**
 * Platform names are proper nouns, but the label still goes through i18n: a
 * locale may transliterate one, and a hard-coded map silently outlives the
 * key set it shadows.
 */
const platformLabel = $derived($i18n.t(`profile.messagingReminders.platform.${channel.platform}`));

const credentialSummary = $derived(() => {
  switch (channel.platform) {
    case 'telegram':
      return channel.credentials.chatId === undefined
        ? ''
        : $i18n.t('profile.messagingReminders.chatSummary', { chat: channel.credentials.chatId });
    case 'matrix':
      return channel.credentials.roomId ?? '';
    case 'discord':
      return channel.credentials.webhookUrl ?? '';
    default:
      return '';
  }
});

let confirmingDelete = $state(false);

function handleToggle() {
  ontoggle(channel.externalId, !channel.isEnabled);
}

// The list owns the request and its error banner; ConfirmDialog only needs a
// settled promise to close itself on.
function handleDelete(): Promise<void> {
  ondelete(channel.externalId);
  return Promise.resolve();
}
</script>

<div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
  <div class="flex items-center gap-3 flex-1 min-w-0">
    <span
      class="w-2.5 h-2.5 rounded-full shrink-0"
      class:bg-green-500={channel.isEnabled}
      class:bg-gray-400={!channel.isEnabled}
      title={channel.isEnabled ? $i18n.t('profile.messagingReminders.toggle.enabled') : $i18n.t('profile.messagingReminders.toggle.disabled')}
    ></span>
    <div class="min-w-0">
      <div class="font-body font-semibold text-gray-800">
        {platformLabel}
      </div>
      <div class="text-sm font-body text-gray-500 truncate">
        {credentialSummary()}
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2 shrink-0">
    <TestMessageButton channelId={channel.externalId} />

    <Button variant="secondary" size="sm" onclick={handleToggle}>
      {channel.isEnabled ? $i18n.t('profile.messagingReminders.toggle.disable') : $i18n.t('profile.messagingReminders.toggle.enable')}
    </Button>

    <Button variant="ghost" size="sm" onclick={() => onedit(channel)}>
      {$i18n.t('common.edit')}
    </Button>

    <Button variant="dangerOutline" size="sm" onclick={() => (confirmingDelete = true)}>
      {$i18n.t('common.delete')}
    </Button>
  </div>
</div>

{#if confirmingDelete}
  <ConfirmDialog
    title={$i18n.t('profile.messagingReminders.delete.title')}
    description={$i18n.t('profile.messagingReminders.delete.description')}
    itemPreview={platformLabel}
    onConfirm={handleDelete}
    onClose={() => (confirmingDelete = false)}
  />
{/if}
