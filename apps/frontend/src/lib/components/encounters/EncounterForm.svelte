<script lang="ts">
import { goto } from '$app/navigation';
import type { EncounterCreateData, EncounterUpdateData } from '$lib/api/encounters.js';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import MarkdownField from '$lib/editor/MarkdownField.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import {
  ENCOUNTER_TYPES,
  type EncounterResponse,
  type EncounterType,
  type FriendSearchResultResponse,
} from '$shared';
import EncounterTypeIcon from './EncounterTypeIcon.svelte';
import { encounterTypeLabel } from './encounter-display';
import FriendMultiSelect from './FriendMultiSelect.svelte';

const i18n = createI18n();
const encounters = getAppContext().stores.encounters;

interface Props {
  /** Existing encounter for edit mode */
  encounter?: EncounterResponse;
  /** Pre-selected friend for new encounter */
  preSelectedFriend?: FriendSearchResultResponse;
  /** Called on successful save */
  onSuccess?: (encounter: EncounterResponse) => void;
  /** Called when form is cancelled */
  onCancel?: () => void;
}

let { encounter, preSelectedFriend, onSuccess, onCancel }: Props = $props();

let isEditMode = $derived(encounter !== undefined);

// Form state
let title = $state(encounter?.title ?? '');
let encounterType = $state<EncounterType>(encounter?.encounterType ?? 'in_person');
let encounterDate = $state(encounter?.encounterDate ?? new Date().toISOString().slice(0, 10));
let locationText = $state(encounter?.locationText ?? '');
let description = $state(encounter?.description ?? '');
let selectedFriends = $state<FriendSearchResultResponse[]>(
  encounter?.friends.map((f) => ({
    id: f.id,
    displayName: f.displayName,
    photoThumbnailUrl: f.photoUrl ?? undefined,
  })) ?? (preSelectedFriend ? [preSelectedFriend] : []),
);

let isSubmitting = $state(false);
let error = $state('');

// Location only applies to in-person encounters
let showLocation = $derived(encounterType === 'in_person');

// Validation — title is optional (a label is derived for calls/messages)
let isValid = $derived(encounterDate.length > 0 && selectedFriends.length > 0);

function handleFriendsChange(friends: FriendSearchResultResponse[]) {
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
    let result: EncounterResponse;

    if (isEditMode && encounter) {
      const input: EncounterUpdateData = {
        title: title.trim() || null,
        encounterType,
        encounterDate,
        friendIds: selectedFriends.map((f) => f.id),
        locationText: showLocation ? locationText.trim() || null : null,
        description: description.trim() || null,
      };
      result = await encounters.updateEncounter(encounter.id, input);
    } else {
      const input: EncounterCreateData = {
        title: title.trim() || undefined,
        encounterType,
        encounterDate,
        friendIds: selectedFriends.map((f) => f.id),
        locationText: showLocation ? locationText.trim() || undefined : undefined,
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
  {#if error.length > 0}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  <!-- Type -->
  <div>
    <span class={FORM_CLASSES.label}>
      {$i18n.t('encounters.form.typeLabel')}
    </span>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {#each ENCOUNTER_TYPES as type (type)}
        <Button
          variant={encounterType === type ? 'secondaryAccent' : 'secondary'}
          size="sm"
          disabled={isSubmitting}
          aria-pressed={encounterType === type}
          onclick={() => (encounterType = type)}
          class={encounterType === type ? 'font-semibold' : ''}
        >
          <EncounterTypeIcon {type} class="w-4 h-4 flex-shrink-0" />
          <span class="truncate">{encounterTypeLabel($i18n.t, type)}</span>
        </Button>
      {/each}
    </div>
  </div>

  <!-- Title -->
  <FormInput
    id="title"
    label={$i18n.t('encounters.form.titleLabel')}
    bind:value={title}
    placeholder={$i18n.t('encounters.form.titlePlaceholder')}
    disabled={isSubmitting}
    optional
    optionalText={$i18n.t('common.optional')}
    autofocus
    size="sm"
  />

  <!-- Date -->
  <FormInput
    id="encounter-date"
    type="date"
    label={$i18n.t('encounters.form.dateLabel')}
    bind:value={encounterDate}
    disabled={isSubmitting}
    size="sm"
    required
  />

  <!-- Friends -->
  <div>
    <span class={FORM_CLASSES.label}>
      {$i18n.t('encounters.form.friendsLabel')} <span class="text-red-500" aria-hidden="true">{$i18n.t('encounters.form.required')}</span>
    </span>
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

  <!-- Location (in-person only) -->
  {#if showLocation}
    <FormInput
      id="location"
      label={$i18n.t('encounters.form.locationLabel')}
      bind:value={locationText}
      placeholder={$i18n.t('encounters.form.locationPlaceholder')}
      disabled={isSubmitting}
      optional
      optionalText={$i18n.t('common.optional')}
      size="sm"
    />
  {/if}

  <!-- Description -->
  <MarkdownField
    bind:value={description}
    label={$i18n.t('encounters.form.notesLabel')}
    hint={$i18n.t('encounters.form.optional')}
    placeholder={$i18n.t('encounters.form.notesPlaceholder')}
    disabled={isSubmitting}
  />

  <!-- Form Actions -->
  <div class="flex gap-3 pt-2">
    <Button
      type="submit"
      class="flex-1"
      loading={isSubmitting}
      disabled={!isValid}
    >
      {isEditMode ? $i18n.t('encounters.updateEncounter') : $i18n.t('encounters.logNew')}
    </Button>

    <Button variant="secondary" onclick={handleCancel} disabled={isSubmitting}>
      {$i18n.t('encounters.form.cancel')}
    </Button>
  </div>
</form>
