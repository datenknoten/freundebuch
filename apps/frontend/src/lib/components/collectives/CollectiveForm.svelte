<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { collectives, collectiveTypes } from '$lib/stores/collectives';
import type { Collective, CollectiveInput, CollectiveType, CollectiveUpdate } from '$shared';
import CollectiveTypeSelect from './CollectiveTypeSelect.svelte';

const i18n = createI18n();

interface Props {
  /** Existing collective for edit mode */
  collective?: Collective;
  /** Called on successful save */
  onSuccess?: (collective: Collective) => void;
  /** Called when form is cancelled */
  onCancel?: () => void;
}

let { collective, onSuccess, onCancel }: Props = $props();

let isEditMode = $derived(!!collective);

// Form state
let name = $state(collective?.name ?? '');
let selectedTypeId = $state(collective?.type.id ?? '');
let notes = $state(collective?.notes ?? '');
let addressStreetLine1 = $state(collective?.address.streetLine1 ?? '');
let addressStreetLine2 = $state(collective?.address.streetLine2 ?? '');
let addressCity = $state(collective?.address.city ?? '');
let addressStateProvince = $state(collective?.address.stateProvince ?? '');
let addressPostalCode = $state(collective?.address.postalCode ?? '');
let addressCountry = $state(collective?.address.country ?? '');

let isSubmitting = $state(false);
let error = $state('');

// Load types on mount
let types = $derived($collectiveTypes);

onMount(async () => {
  if (types.length === 0) {
    await collectives.loadTypes();
  }
});

// Validation
let isValid = $derived(name.trim().length > 0 && (isEditMode || selectedTypeId.length > 0));

function handleTypeChange(type: CollectiveType | null) {
  selectedTypeId = type?.id ?? '';
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  if (!isValid) {
    error = $i18n.t('collectives.form.validationError');
    return;
  }

  error = '';
  isSubmitting = true;

  try {
    let result: Collective;

    if (isEditMode && collective) {
      const input: CollectiveUpdate = {
        name: name.trim(),
        notes: notes.trim() || null,
        address_street_line1: addressStreetLine1.trim() || null,
        address_street_line2: addressStreetLine2.trim() || null,
        address_city: addressCity.trim() || null,
        address_state_province: addressStateProvince.trim() || null,
        address_postal_code: addressPostalCode.trim() || null,
        address_country: addressCountry.trim() || null,
      };
      result = await collectives.updateCollective(collective.id, input);
    } else {
      const input: CollectiveInput = {
        name: name.trim(),
        collective_type_id: selectedTypeId,
        notes: notes.trim() || undefined,
        address_street_line1: addressStreetLine1.trim() || undefined,
        address_street_line2: addressStreetLine2.trim() || undefined,
        address_city: addressCity.trim() || undefined,
        address_state_province: addressStateProvince.trim() || undefined,
        address_postal_code: addressPostalCode.trim() || undefined,
        address_country: addressCountry.trim() || undefined,
      };
      result = await collectives.createCollective(input);
    }

    if (onSuccess) {
      onSuccess(result);
    } else {
      goto(`/collectives/${result.id}`);
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('collectives.form.saveError');
  } finally {
    isSubmitting = false;
  }
}

function handleCancel() {
  if (onCancel) {
    onCancel();
  } else {
    goto('/collectives');
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

  <!-- Name -->
  <div>
    <label for="name" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('collectives.form.nameLabel')} <span class="text-red-500">{$i18n.t('collectives.form.required')}</span>
    </label>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id="name"
      type="text"
      bind:value={name}
      placeholder={$i18n.t('collectives.form.namePlaceholder')}
      disabled={isSubmitting}
      autofocus={!isEditMode}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
      required
    />
  </div>

  <!-- Type (only for create mode) -->
  {#if !isEditMode}
    <div>
      <label for="type" class="block text-sm font-body font-medium text-gray-700 mb-1">
        {$i18n.t('collectives.form.typeLabel')} <span class="text-red-500">{$i18n.t('collectives.form.required')}</span>
      </label>
      <CollectiveTypeSelect
        value={selectedTypeId}
        placeholder={$i18n.t('collectives.form.typePlaceholder')}
        disabled={isSubmitting}
        onChange={handleTypeChange}
      />
      <p class="mt-1 text-xs text-gray-500 font-body">
        {$i18n.t('collectives.form.typeHelp')}
      </p>
    </div>
  {:else}
    <div>
      <label class="block text-sm font-body font-medium text-gray-700 mb-1">
        {$i18n.t('collectives.form.typeLabel')}
      </label>
      <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-body">
        {collective?.type.name}
      </div>
      <p class="mt-1 text-xs text-gray-500 font-body">
        {$i18n.t('collectives.form.typeCannotChange')}
      </p>
    </div>
  {/if}

  <!-- Notes -->
  <div>
    <label for="notes" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('collectives.form.notesLabel')} <span class="text-gray-400">{$i18n.t('collectives.form.optional')}</span>
    </label>
    <textarea
      id="notes"
      bind:value={notes}
      rows="3"
      placeholder={$i18n.t('collectives.form.notesPlaceholder')}
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none disabled:opacity-50"
    ></textarea>
  </div>

  <!-- Address section (edit mode only - use subresource detail for new collectives) -->
  {#if isEditMode}
  <fieldset class="border border-gray-200 rounded-lg p-4">
    <legend class="text-sm font-body font-medium text-gray-700 px-2">
      {$i18n.t('collectives.form.addressSection')} <span class="text-gray-400">{$i18n.t('collectives.form.optional')}</span>
    </legend>

    <div class="space-y-4">
      <div>
        <label for="street1" class="block text-sm font-body font-medium text-gray-700 mb-1">
          {$i18n.t('collectives.form.streetLabel')}
        </label>
        <input
          id="street1"
          type="text"
          bind:value={addressStreetLine1}
          placeholder={$i18n.t('collectives.form.streetPlaceholder')}
          disabled={isSubmitting}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
        />
      </div>

      <div>
        <input
          id="street2"
          type="text"
          bind:value={addressStreetLine2}
          placeholder={$i18n.t('collectives.form.street2Placeholder')}
          disabled={isSubmitting}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="city" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('collectives.form.cityLabel')}
          </label>
          <input
            id="city"
            type="text"
            bind:value={addressCity}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label for="state" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('collectives.form.stateLabel')}
          </label>
          <input
            id="state"
            type="text"
            bind:value={addressStateProvince}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="postal" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('collectives.form.postalLabel')}
          </label>
          <input
            id="postal"
            type="text"
            bind:value={addressPostalCode}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label for="country" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('collectives.form.countryLabel')}
          </label>
          <input
            id="country"
            type="text"
            bind:value={addressCountry}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  </fieldset>
  {/if}

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
          {$i18n.t('collectives.form.saving')}
        </span>
      {:else}
        {isEditMode ? $i18n.t('collectives.updateCollective') : $i18n.t('collectives.createNew')}
      {/if}
    </button>

    <button
      type="button"
      onclick={handleCancel}
      disabled={isSubmitting}
      class="px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {$i18n.t('collectives.form.cancel')}
    </button>
  </div>
</form>
