<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { NotificationChannel } from '$shared';
import TestMessageButton from './TestMessageButton.svelte';

const i18n = createI18n();

interface Props {
  channel: NotificationChannel;
  ontoggle: (channelId: string, isEnabled: boolean) => void;
  onedit: (channel: NotificationChannel) => void;
  ondelete: (channelId: string) => void;
}

let { channel, ontoggle, onedit, ondelete }: Props = $props();

const platformLabels: Record<string, string> = {
  telegram: 'Telegram',
  matrix: 'Matrix',
  discord: 'Discord',
};

const credentialSummary = $derived(() => {
  switch (channel.platform) {
    case 'telegram':
      return channel.credentials.chatId ? `Chat: ${channel.credentials.chatId}` : '';
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

function handleDelete() {
  if (confirmingDelete) {
    ondelete(channel.externalId);
    confirmingDelete = false;
  } else {
    confirmingDelete = true;
    setTimeout(() => {
      confirmingDelete = false;
    }, 5000);
  }
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
        {platformLabels[channel.platform] ?? channel.platform}
      </div>
      <div class="text-sm font-body text-gray-500 truncate">
        {credentialSummary()}
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2 shrink-0">
    <TestMessageButton channelId={channel.externalId} />

    <button
      onclick={handleToggle}
      class="text-sm font-body px-2 py-1 rounded transition-colors"
      class:text-green-700={!channel.isEnabled}
      class:hover:bg-green-50={!channel.isEnabled}
      class:text-yellow-700={channel.isEnabled}
      class:hover:bg-yellow-50={channel.isEnabled}
    >
      {channel.isEnabled ? $i18n.t('profile.messagingReminders.toggle.disable') : $i18n.t('profile.messagingReminders.toggle.enable')}
    </button>

    <button
      onclick={() => onedit(channel)}
      class="text-sm font-body text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
    >
      {$i18n.t('common.edit')}
    </button>

    <button
      onclick={handleDelete}
      class="text-sm font-body px-2 py-1 rounded transition-colors"
      class:text-red-600={!confirmingDelete}
      class:hover:bg-red-50={!confirmingDelete}
      class:bg-red-600={confirmingDelete}
      class:text-white={confirmingDelete}
    >
      {confirmingDelete ? $i18n.t('profile.messagingReminders.delete.confirm') : $i18n.t('common.delete')}
    </button>
  </div>
</div>
