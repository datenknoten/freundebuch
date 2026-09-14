<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { Button, FormInput, FormSelect } from '$lib/components/ui';
import MarkdownField from '$lib/editor/markdown-field.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { collectives, collectiveTypes } from '$lib/stores/collectives';
import type { Collective, CollectiveInput, CollectiveUpdate } from '$shared';

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

let isSubmitting = $state(false);
let error = $state('');

// Load types on mount
let types = $derived($collectiveTypes);
let isLoadingTypes = $derived($collectives.isLoadingTypes);
let typeOptions = $derived(types.map((type) => ({ value: type.id, label: type.name })));

onMount(async () => {
  if (types.length === 0) {
    await collectives.loadTypes();
  }
});

// Validation
let isValid = $derived(name.trim().length > 0 && (isEditMode || selectedTypeId.length > 0));

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
      };
      result = await collectives.updateCollective(collective.id, input);
    } else {
      const input: CollectiveInput = {
        name: name.trim(),
        collective_type_id: selectedTypeId,
        notes: notes.trim() || undefined,
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
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  <FormInput
    id="name"
    label={$i18n.t('collectives.form.nameLabel')}
    bind:value={name}
    placeholder={$i18n.t('collectives.form.namePlaceholder')}
    disabled={isSubmitting}
    autofocus={!isEditMode}
    size="sm"
    required
  />

  {#if isEditMode}
    <FormInput
      id="type"
      label={$i18n.t('collectives.form.typeLabel')}
      value={collective?.type.name ?? ''}
      helper={$i18n.t('collectives.form.typeCannotChange')}
      size="sm"
      disabled
    />
  {:else}
    <FormSelect
      id="type"
      label={$i18n.t('collectives.form.typeLabel')}
      bind:value={selectedTypeId}
      options={typeOptions}
      placeholderOption={isLoadingTypes
        ? $i18n.t('collectives.loadingTypes')
        : $i18n.t('collectives.form.typePlaceholder')}
      helper={$i18n.t('collectives.form.typeHelp')}
      disabled={isSubmitting || isLoadingTypes}
      size="sm"
      required
    />
  {/if}

  <!-- Notes -->
  <MarkdownField
    bind:value={notes}
    label={$i18n.t('collectives.form.notesLabel')}
    hint={$i18n.t('collectives.form.optional')}
    placeholder={$i18n.t('collectives.form.notesPlaceholder')}
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
      {isEditMode ? $i18n.t('collectives.updateCollective') : $i18n.t('collectives.createNew')}
    </Button>

    <Button variant="secondary" onclick={handleCancel} disabled={isSubmitting}>
      {$i18n.t('collectives.form.cancel')}
    </Button>
  </div>
</form>
