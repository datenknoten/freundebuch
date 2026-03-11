<script lang="ts">
import { onMount } from 'svelte';
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
      <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.8569 17.0817C16.7514 16.857 18.5783 16.4116 20.3111 15.7719C18.8743 14.177 17.9998 12.0656 17.9998 9.75V9.04919C17.9999 9.03281 18 9.01641 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9L5.9998 9.75C5.9998 12.0656 5.12527 14.177 3.68848 15.7719C5.4214 16.4116 7.24843 16.857 9.14314 17.0818M14.8569 17.0817C13.92 17.1928 12.9666 17.25 11.9998 17.25C11.0332 17.25 10.0799 17.1929 9.14314 17.0818M14.8569 17.0817C14.9498 17.3711 15 17.6797 15 18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18C9 17.6797 9.05019 17.3712 9.14314 17.0818" />
      </svg>
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
