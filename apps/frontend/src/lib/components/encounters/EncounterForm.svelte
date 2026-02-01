<script lang="ts">
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { encounters } from '$lib/stores/encounters';
import type { Encounter, EncounterInput, EncounterUpdate, FriendSearchResult } from '$shared';
import FriendMultiSelect from './FriendMultiSelect.svelte';

const i18n = createI18n();

interface Props {
  /** Existing encounter for edit mode */
  encounter?: Encounter;
  /** Pre-selected friend for new encounter */
  preSelectedFriend?: FriendSearchResult;
  /** Called on successful save */
  onSuccess?: (encounter: Encounter) => void;
  /** Called when form is cancelled */
  onCancel?: () => void;
}

let { encounter, preSelectedFriend, onSuccess, onCancel }: Props = $props();

let isEditMode = $derived(!!encounter);

// Form state
let title = $state(encounter?.title ?? '');
let encounterDate = $state(encounter?.encounterDate ?? new Date().toISOString().split('T')[0]);
let locationText = $state(encounter?.locationText ?? '');
let description = $state(encounter?.description ?? '');
let selectedFriends = $state<FriendSearchResult[]>(
  encounter?.friends.map((f) => ({
    id: f.id,
    displayName: f.displayName,
    photoThumbnailUrl: f.photoUrl,
  })) ?? (preSelectedFriend ? [preSelectedFriend] : []),
);

let isSubmitting = $state(false);
let error = $state('');

// Validation
let isValid = $derived(
  title.trim().length > 0 && encounterDate.length > 0 && selectedFriends.length > 0,
);

function handleFriendsChange(friends: FriendSearchResult[]) {
  selectedFriends = friends;
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  if (!isValid) {
    error = $i18n.t('encounters.form.validationError');
    return;
  }

  error = '';
  isSubmitting = true;

  try {
    let result: Encounter;

    if (isEditMode && encounter) {
      const input: EncounterUpdate = {
        title: title.trim(),
        encounter_date: encounterDate,
        friend_ids: selectedFriends.map((f) => f.id),
        location_text: locationText.trim() || null,
        description: description.trim() || null,
      };
      result = await encounters.updateEncounter(encounter.id, input);
    } else {
      const input: EncounterInput = {
        title: title.trim(),
        encounter_date: encounterDate,
        friend_ids: selectedFriends.map((f) => f.id),
        location_text: locationText.trim() || undefined,
        description: description.trim() || undefined,
      };
      result = await encounters.createEncounter(input);
    }

    if (onSuccess) {
      onSuccess(result);
    } else {
      goto(`/encounters/${result.id}`);
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('encounters.form.saveError');
  } finally {
    isSubmitting = false;
  }
}

function handleCancel() {
  if (onCancel) {
    onCancel();
  } else {
    goto('/encounters');
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
  {#if error}
    <div
      class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm"
      role="alert"
    >
      {error}
    </div>
  {/if}

  <!-- Title -->
  <div>
    <label for="title" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('encounters.form.titleLabel')} <span class="text-red-500">{$i18n.t('encounters.form.required')}</span>
    </label>
    <input
      id="title"
      type="text"
      bind:value={title}
      placeholder={$i18n.t('encounters.form.titlePlaceholder')}
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
      required
    />
  </div>

  <!-- Date -->
  <div>
    <label for="encounter-date" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('encounters.form.dateLabel')} <span class="text-red-500">{$i18n.t('encounters.form.required')}</span>
    </label>
    <input
      id="encounter-date"
      type="date"
      bind:value={encounterDate}
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
      required
    />
  </div>

  <!-- Friends -->
  <div>
    <label class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('encounters.form.friendsLabel')} <span class="text-red-500">{$i18n.t('encounters.form.required')}</span>
    </label>
    <FriendMultiSelect
      {selectedFriends}
      placeholder={$i18n.t('encounters.form.friendsPlaceholder')}
      disabled={isSubmitting}
      onChange={handleFriendsChange}
    />
    {#if selectedFriends.length === 0}
      <p class="mt-1 text-xs text-gray-500 font-body">
        {$i18n.t('encounters.form.friendsHelp')}
      </p>
    {/if}
  </div>

  <!-- Location -->
  <div>
    <label for="location" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('encounters.form.locationLabel')} <span class="text-gray-400">{$i18n.t('encounters.form.optional')}</span>
    </label>
    <input
      id="location"
      type="text"
      bind:value={locationText}
      placeholder={$i18n.t('encounters.form.locationPlaceholder')}
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
    />
  </div>

  <!-- Description -->
  <div>
    <label for="description" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('encounters.form.notesLabel')} <span class="text-gray-400">{$i18n.t('encounters.form.optional')}</span>
    </label>
    <textarea
      id="description"
      bind:value={description}
      rows="3"
      placeholder={$i18n.t('encounters.form.notesPlaceholder')}
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none disabled:opacity-50"
    ></textarea>
  </div>

  <!-- Form Actions -->
  <div class="flex gap-3 pt-2">
    <button
      type="submit"
      disabled={isSubmitting || !isValid}
      class="flex-1 bg-forest text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isSubmitting}
        <span class="inline-flex items-center gap-2">
          <span class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          {$i18n.t('encounters.form.saving')}
        </span>
      {:else}
        {isEditMode ? $i18n.t('encounters.updateEncounter') : $i18n.t('encounters.logNew')}
      {/if}
    </button>

    <button
      type="button"
      onclick={handleCancel}
      disabled={isSubmitting}
      class="px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {$i18n.t('encounters.form.cancel')}
    </button>
  </div>
</form>
