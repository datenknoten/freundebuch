<script lang="ts">
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { encounters } from '$lib/stores/encounters';
import type { Encounter } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';

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
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-heading font-bold text-gray-900">
        {encounter.title}
      </h1>
      <div class="mt-2 flex items-center gap-2 text-gray-600 font-body">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatDate(encounter.encounterDate)}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <button
        type="button"
        onclick={() => onEdit?.()}
        class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg font-body text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {$i18n.t('encounters.detail.edit')}
      </button>

      <button
        type="button"
        onclick={() => showDeleteConfirm = true}
        class="inline-flex items-center gap-2 px-3 py-2 border border-red-300 rounded-lg font-body text-sm text-red-700 hover:bg-red-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {$i18n.t('encounters.detail.delete')}
      </button>
    </div>
  </div>

  <!-- Location -->
  {#if encounter.locationText}
    <div class="flex items-center gap-2 text-gray-600 font-body">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>{encounter.locationText}</span>
    </div>
  {/if}

  <!-- Friends -->
  <div class="bg-gray-50 rounded-lg p-4">
    <h2 class="text-sm font-body font-medium text-gray-700 mb-3">
      {$i18n.t('encounters.detail.friends')} ({encounter.friends.length})
    </h2>
    <div class="flex flex-wrap gap-3">
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
  </div>

  <!-- Description -->
  {#if encounter.description}
    <div>
      <h2 class="text-sm font-body font-medium text-gray-700 mb-2">{$i18n.t('encounters.detail.notes')}</h2>
      <p class="text-gray-600 font-body whitespace-pre-wrap">
        {encounter.description}
      </p>
    </div>
  {/if}

  <!-- Metadata -->
  <div class="border-t border-gray-200 pt-4 text-xs text-gray-500 font-body">
    <p>{$i18n.t('encounters.detail.created')} {formatTimestamp(encounter.createdAt)}</p>
    <p>{$i18n.t('encounters.detail.lastUpdated')} {formatTimestamp(encounter.updatedAt)}</p>
  </div>
</div>

<!-- Delete confirmation modal -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-modal-title"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <h3 id="delete-modal-title" class="text-lg font-heading font-semibold text-gray-900">
        {$i18n.t('encounters.detail.deleteConfirmTitle')}
      </h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        {$i18n.t('encounters.detail.deleteConfirmMessage', { title: encounter.title })}
      </p>

      <div class="mt-6 flex gap-3 justify-end">
        <button
          type="button"
          onclick={() => showDeleteConfirm = false}
          disabled={isDeleting}
          class="px-4 py-2 border border-gray-300 rounded-lg font-body text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {$i18n.t('encounters.form.cancel')}
        </button>
        <button
          type="button"
          onclick={handleDelete}
          disabled={isDeleting}
          class="px-4 py-2 bg-red-600 text-white rounded-lg font-body text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? $i18n.t('encounters.detail.deleting') : $i18n.t('encounters.detail.delete')}
        </button>
      </div>
    </div>
  </div>
{/if}
