<script lang="ts">
import { onMount } from 'svelte';
import Bell from 'svelte-heros-v2/Bell.svelte';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { notificationChannels } from '$lib/stores/notificationChannels';
import type {
  NotificationChannel,
  NotificationChannelCreateInput,
  NotificationChannelUpdateInput,
} from '$shared';
import NotificationChannelCard from './NotificationChannelCard.svelte';
import NotificationChannelForm from './NotificationChannelForm.svelte';

const i18n = createI18n();

let showForm = $state(false);
let editingChannel = $state<NotificationChannel | undefined>(undefined);
let formError = $state('');
let isSubmitting = $state(false);

onMount(() => {
  notificationChannels.loadChannels();
});

function handleAddChannel() {
  editingChannel = undefined;
  formError = '';
  showForm = true;
}

function handleEditChannel(channel: NotificationChannel) {
  editingChannel = channel;
  formError = '';
  showForm = true;
}

function handleCancelForm() {
  showForm = false;
  editingChannel = undefined;
  formError = '';
}

async function handleSubmitForm(
  input: NotificationChannelCreateInput | NotificationChannelUpdateInput,
) {
  isSubmitting = true;
  formError = '';
  try {
    if (editingChannel) {
      await notificationChannels.updateChannel(
        editingChannel.externalId,
        input as NotificationChannelUpdateInput,
      );
    } else {
      await notificationChannels.createChannel(input as NotificationChannelCreateInput);
    }
    showForm = false;
    editingChannel = undefined;
  } catch (err) {
    formError = (err as Error)?.message || 'Failed to save channel';
  } finally {
    isSubmitting = false;
  }
}

async function handleToggle(channelId: string, isEnabled: boolean) {
  try {
    await notificationChannels.toggleChannel(channelId, isEnabled);
  } catch {
    // Error handled by store
  }
}

async function handleDelete(channelId: string) {
  try {
    await notificationChannels.deleteChannel(channelId);
  } catch {
    // Error handled by store
  }
}
</script>

<div class="space-y-4">
  {#if $notificationChannels.error}
    <AlertBanner variant="error">{$notificationChannels.error}</AlertBanner>
  {/if}

  {#if showForm}
    <div class="bg-gray-50 rounded-lg p-4">
      {#if formError}
        <div class="mb-4">
          <AlertBanner variant="error">{formError}</AlertBanner>
        </div>
      {/if}
      <NotificationChannelForm
        channel={editingChannel}
        onsubmit={handleSubmitForm}
        oncancel={handleCancelForm}
        isLoading={isSubmitting}
      />
    </div>
  {:else}
    <button
      onclick={handleAddChannel}
      class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
    >
      {$i18n.t('profile.messagingReminders.addChannel')}
    </button>
  {/if}

  {#if $notificationChannels.isLoading}
    <div class="text-center py-4">
      <p class="text-gray-500 font-body">{$i18n.t('common.loading')}</p>
    </div>
  {:else if $notificationChannels.channels.length === 0 && !showForm}
    <div class="text-center py-8 bg-gray-50 rounded-lg">
      <Bell class="w-12 h-12 mx-auto text-gray-400 mb-3" strokeWidth="2" />
      <p class="text-gray-600 font-body">{$i18n.t('profile.messagingReminders.noChannels')}</p>
      <p class="text-gray-500 font-body text-sm mt-1">{$i18n.t('profile.messagingReminders.description')}</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each $notificationChannels.channels as channel (channel.externalId)}
        <NotificationChannelCard
          {channel}
          ontoggle={handleToggle}
          onedit={handleEditChannel}
          ondelete={handleDelete}
        />
      {/each}
    </div>
  {/if}
</div>
