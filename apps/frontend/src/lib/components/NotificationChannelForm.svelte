<script lang="ts">
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { createI18n } from '$lib/i18n/index.js';
import type {
  NotificationChannel,
  NotificationChannelCreateInput,
  NotificationChannelUpdateInput,
  NotificationPlatform,
} from '$shared';

const i18n = createI18n();

interface Props {
  channel?: NotificationChannel;
  onsubmit: (input: NotificationChannelCreateInput | NotificationChannelUpdateInput) => void;
  oncancel: () => void;
  isLoading?: boolean;
}

let { channel, onsubmit, oncancel, isLoading = false }: Props = $props();

const isEditMode = $derived(!!channel);

let platform = $state<NotificationPlatform>(channel?.platform ?? 'telegram');
let isEnabled = $state(channel?.isEnabled ?? true);
let lookaheadDays = $state(String(channel?.lookaheadDays ?? 7));
let notifyTime = $state(channel?.notifyTime ?? '08:00');

// Telegram
let botToken = $state('');
let chatId = $state(channel?.platform === 'telegram' ? (channel.credentials.chatId ?? '') : '');

// Matrix
let homeserver = $state(
  channel?.platform === 'matrix' ? (channel.credentials.homeserver ?? '') : '',
);
let accessToken = $state('');
let roomId = $state(channel?.platform === 'matrix' ? (channel.credentials.roomId ?? '') : '');

// Discord
let webhookUrl = $state('');

const platformOptions = [
  {
    value: 'telegram' as NotificationPlatform,
    label: $i18n.t('profile.messagingReminders.platform.telegram'),
  },
  {
    value: 'matrix' as NotificationPlatform,
    label: $i18n.t('profile.messagingReminders.platform.matrix'),
  },
  {
    value: 'discord' as NotificationPlatform,
    label: $i18n.t('profile.messagingReminders.platform.discord'),
  },
];

function handleSubmit(event: SubmitEvent) {
  event.preventDefault();

  const credentials: Record<string, string> = {};
  switch (platform) {
    case 'telegram':
      if (botToken) credentials.botToken = botToken;
      if (chatId) credentials.chatId = chatId;
      break;
    case 'matrix':
      if (homeserver) credentials.homeserver = homeserver;
      if (accessToken) credentials.accessToken = accessToken;
      if (roomId) credentials.roomId = roomId;
      break;
    case 'discord':
      if (webhookUrl) credentials.webhookUrl = webhookUrl;
      break;
  }

  if (isEditMode) {
    const input: NotificationChannelUpdateInput = {
      isEnabled,
      lookaheadDays: Number(lookaheadDays),
      notifyTime,
    };
    if (Object.keys(credentials).length > 0) {
      input.credentials = credentials;
    }
    onsubmit(input);
  } else {
    const input: NotificationChannelCreateInput = {
      platform,
      isEnabled,
      lookaheadDays: Number(lookaheadDays),
      notifyTime,
      credentials,
    };
    onsubmit(input);
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if !isEditMode}
    <FormSelect
      id="platform"
      label={$i18n.t('profile.messagingReminders.fields.platform')}
      bind:value={platform}
      options={platformOptions}
      required
    />
  {:else}
    <div>
      <span class="block text-sm font-body font-semibold text-gray-700 mb-1">
        {$i18n.t('profile.messagingReminders.fields.platform')}
      </span>
      <span class="font-body text-gray-600 capitalize">{platform}</span>
    </div>
  {/if}

  {#if platform === 'telegram'}
    <FormInput
      id="botToken"
      label={$i18n.t('profile.messagingReminders.fields.botToken')}
      bind:value={botToken}
      placeholder={isEditMode ? '(unchanged)' : ''}
      required={!isEditMode}
    />
    <FormInput
      id="chatId"
      label={$i18n.t('profile.messagingReminders.fields.chatId')}
      bind:value={chatId}
      required={!isEditMode}
    />
  {:else if platform === 'matrix'}
    <FormInput
      id="homeserver"
      label={$i18n.t('profile.messagingReminders.fields.homeserver')}
      bind:value={homeserver}
      type="url"
      placeholder="https://matrix.example.com"
      required={!isEditMode}
    />
    <FormInput
      id="accessToken"
      label={$i18n.t('profile.messagingReminders.fields.accessToken')}
      bind:value={accessToken}
      placeholder={isEditMode ? '(unchanged)' : ''}
      required={!isEditMode}
    />
    <FormInput
      id="roomId"
      label={$i18n.t('profile.messagingReminders.fields.roomId')}
      bind:value={roomId}
      placeholder="!roomid:example.com"
      required={!isEditMode}
    />
  {:else if platform === 'discord'}
    <FormInput
      id="webhookUrl"
      label={$i18n.t('profile.messagingReminders.fields.webhookUrl')}
      bind:value={webhookUrl}
      type="url"
      placeholder={isEditMode ? '(unchanged)' : 'https://discord.com/api/webhooks/...'}
      required={!isEditMode}
    />
  {/if}

  <FormInput
    id="lookaheadDays"
    label={$i18n.t('profile.messagingReminders.fields.lookaheadDays')}
    bind:value={lookaheadDays}
    type="text"
  />

  <FormInput
    id="notifyTime"
    label={$i18n.t('profile.messagingReminders.fields.notifyTime')}
    bind:value={notifyTime}
    type="text"
    placeholder="08:00"
  />

  <div class="flex gap-3 pt-2">
    <button
      type="submit"
      disabled={isLoading}
      class="flex-1 bg-forest text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? $i18n.t('common.saving') : $i18n.t('common.save')}
    </button>
    <button
      type="button"
      onclick={oncancel}
      disabled={isLoading}
      class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-body font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {$i18n.t('common.cancel')}
    </button>
  </div>
</form>
