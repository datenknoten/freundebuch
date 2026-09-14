<script lang="ts">
import Button from '$lib/components/ui/button.svelte';
import FormInput from '$lib/components/ui/form-input.svelte';
import FormSelect from '$lib/components/ui/form-select.svelte';
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

const isEditMode = $derived(channel !== undefined);

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

const platformLabel = $derived(
  platformOptions.find((option) => option.value === platform)?.label ?? platform,
);

function handleSubmit(event: SubmitEvent) {
  event.preventDefault();

  const credentials: Record<string, string> = {};
  switch (platform) {
    case 'telegram':
      if (botToken.length > 0) credentials.botToken = botToken;
      if (chatId.length > 0) credentials.chatId = chatId;
      break;
    case 'matrix':
      if (homeserver.length > 0) credentials.homeserver = homeserver;
      if (accessToken.length > 0) credentials.accessToken = accessToken;
      if (roomId.length > 0) credentials.roomId = roomId;
      break;
    case 'discord':
      if (webhookUrl.length > 0) credentials.webhookUrl = webhookUrl;
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
    <FormInput
      id="platform"
      label={$i18n.t('profile.messagingReminders.fields.platform')}
      value={platformLabel}
      disabled
    />
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
    <Button type="submit" loading={isLoading} class="flex-1">
      {$i18n.t('common.save')}
    </Button>
    <Button variant="secondary" disabled={isLoading} onclick={oncancel} class="flex-1">
      {$i18n.t('common.cancel')}
    </Button>
  </div>
</form>
