<script lang="ts">
import { onMount } from 'svelte';
import Bell from 'svelte-heros-v2/Bell.svelte';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type {
  NotificationChannelCreateInput,
  NotificationChannelResponse,
  NotificationChannelUpdateInput,
} from '$shared';
import NotificationChannelCard from './NotificationChannelCard.svelte';
import NotificationChannelForm from './NotificationChannelForm.svelte';

const notificationChannels = getAppContext().stores.notificationChannels;

const i18n = createI18n();

let showForm = $state(false);
let editingChannel = $state<NotificationChannelResponse | undefined>(undefined);
let formError = $state('');
let isSubmitting = $state(false);

onMount(() => {
  void notificationChannels.loadChannels();
});

function handleAddChannel() {
  editingChannel = undefined;
  formError = '';
  showForm = true;
}

function handleEditChannel(channel: NotificationChannelResponse) {
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
    formError =
      err instanceof Error ? err.message : $i18n.t('profile.messagingReminders.saveError');
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
      {#if formError.length > 0}
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
    <Button onclick={handleAddChannel}>
      {$i18n.t('profile.messagingReminders.addChannel')}
    </Button>
  {/if}

  {#if $notificationChannels.isLoading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" label={$i18n.t('common.loading')} />
    </div>
  {:else if $notificationChannels.channels.length === 0 && !showForm}
    <EmptyState
      icon={Bell}
      title={$i18n.t('profile.messagingReminders.noChannels')}
      description={$i18n.t('profile.messagingReminders.description')}
    />
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
