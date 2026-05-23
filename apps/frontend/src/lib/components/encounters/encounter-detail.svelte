<script lang="ts">
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { encounters } from '$lib/stores/encounters';
import type { Encounter } from '$shared';
import FriendAvatar from '../friends/friend-avatar.svelte';

const i18n = createI18n();

interface Props {
  encounter: Encounter;
  onEdit?: () => void;
}

let { encounter, onEdit }: Props = $props();

let isDeleting = $state(false);
let showDeleteConfirm = $state(false);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function handleDelete() {
  isDeleting = true;
  try {
    await encounters.deleteEncounter(encounter.id);
    goto('/encounters');
  } catch (err) {
    console.error('Failed to delete encounter:', err);
    isDeleting = false;
    showDeleteConfirm = false;
  }
}
</script>

<div class="space-y-6">
  <!-- Header with icon avatar and actions -->
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <!-- Calendar icon as avatar -->
    <div class="flex-shrink-0 w-20 h-20 rounded-full bg-forest/10 text-forest flex items-center justify-center">
      <Calendar class="w-10 h-10" strokeWidth="2" />
    </div>

    <div class="flex-1 text-center sm:text-left">
      <h1 class="text-3xl font-heading text-gray-900">{encounter.title}</h1>
      <div class="mt-1 flex items-center gap-2 text-gray-600 font-body justify-center sm:justify-start">
        <Calendar class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
        <span>{formatDate(encounter.encounterDate)}</span>
      </div>
      {#if encounter.locationText}
        <div class="mt-1 flex items-center gap-2 text-gray-600 font-body text-sm justify-center sm:justify-start">
          <MapPin class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
          <span>{encounter.locationText}</span>
        </div>
      {/if}
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        onclick={() => onEdit?.()}
        class="px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        {$i18n.t('common.edit')}
      </button>
      <button
        type="button"
        onclick={() => showDeleteConfirm = true}
        class="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-body font-semibold hover:bg-red-50 transition-colors"
      >
        {$i18n.t('common.delete')}
      </button>
    </div>
  </div>

  <!-- ==================== FRIENDS SECTION ==================== -->
  <section class="space-y-2">
    <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
      <Users class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('encounters.detail.friends')}
      <span class="text-sm font-body font-normal text-white/80">({encounter.friends.length})</span>
    </h2>
    <div class="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
      {#each encounter.friends as friend (friend.id)}
        <a
          href="/friends/{friend.id}"
          class="inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-forest transition-colors"
        >
          <FriendAvatar
            displayName={friend.displayName}
            photoUrl={friend.photoUrl}
            size="sm"
          />
          <span class="font-body text-sm text-gray-900">{friend.displayName}</span>
        </a>
      {/each}
    </div>
  </section>

  <!-- ==================== NOTES SECTION ==================== -->
  {#if encounter.description}
    <section class="space-y-2">
      <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
        <DocumentText class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('encounters.detail.notes')}
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg font-body text-gray-700 whitespace-pre-wrap">
        {encounter.description}
      </div>
    </section>
  {/if}

  <!-- ==================== METADATA FOOTER ==================== -->
  <section class="text-sm text-gray-500 font-body">
    <div class="flex flex-wrap gap-4">
      <span>{$i18n.t('encounters.detail.created')} {formatTimestamp(encounter.createdAt)}</span>
      <span>{$i18n.t('encounters.detail.lastUpdated')} {formatTimestamp(encounter.updatedAt)}</span>
    </div>
  </section>
</div>

<!-- Delete confirmation modal -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-modal-title"
  >
    <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
      <h3 id="delete-modal-title" class="text-xl font-heading text-gray-900 mb-2">
        {$i18n.t('encounters.detail.deleteConfirmTitle')}
      </h3>
      <p class="text-gray-600 font-body mb-6">
        {$i18n.t('encounters.detail.deleteConfirmMessage', { title: encounter.title })}
      </p>
      <div class="flex gap-3">
        <button
          type="button"
          onclick={() => showDeleteConfirm = false}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {$i18n.t('encounters.form.cancel')}
        </button>
        <button
          type="button"
          onclick={handleDelete}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? $i18n.t('encounters.detail.deleting') : $i18n.t('common.delete')}
        </button>
      </div>
    </div>
  </div>
{/if}
