<script lang="ts">
import { onMount } from 'svelte';
import * as collectivesApi from '$lib/api/collectives.js';
import AlertBanner from '$lib/components/alert-banner.svelte';
import CollectiveSearchInput from '$lib/components/collectives/collective-search-input.svelte';
import RelationshipPreview from '$lib/components/collectives/relationship-preview.svelte';
import { FormCheckbox, FormSelect, formClasses } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';
import Spinner from '$lib/components/ui/spinner.svelte';
import { createI18n } from '$lib/i18n/index.js';
import {
  collectives,
  collectivesList,
  collectiveTypes,
  previewMemberRelationships,
} from '$lib/stores/collectives';
import type {
  CollectiveListItem,
  CollectiveRole,
  CollectiveType,
  RelationshipPreviewResponse,
} from '$shared';
import DetailEditModal from './detail-edit-modal.svelte';

const i18n = createI18n();

interface Props {
  friendId: string;
  friendDisplayName: string;
  existingCollectiveIds: string[];
  onSuccess: () => void;
  onClose: () => void;
}

let { friendId, friendDisplayName, existingCollectiveIds, onSuccess, onClose }: Props = $props();

// Data state
let allCollectives = $state<CollectiveListItem[]>([]);
let types = $state<CollectiveType[]>([]);
let isLoadingData = $state(true);

// Form state
let selectedCollectiveId = $state('');
let selectedRoleId = $state('');
let skipAutoRelationships = $state(false);
let preview = $state<RelationshipPreviewResponse | null>(null);
let isLoadingPreview = $state(false);
let isSubmitting = $state(false);
let error = $state<string | null>(null);
let previewAbortController: AbortController | null = null;

// Derived: filter out collectives the friend is already in
let existingSet = $derived(new Set(existingCollectiveIds));
let availableCollectives = $derived(
  allCollectives.filter((c) => !existingSet.has(c.id) && !c.deletedAt),
);

// Derived: roles for the selected collective's type
let selectedCollective = $derived(
  availableCollectives.find((c) => c.id === selectedCollectiveId) ?? null,
);
let rolesForSelected = $derived.by(() => {
  if (!selectedCollective) return [] as CollectiveRole[];
  const typeObj = types.find((t) => t.id === selectedCollective.type.id);
  return typeObj?.roles.toSorted((a, b) => a.sortOrder - b.sortOrder) ?? [];
});

let isValid = $derived(selectedCollectiveId !== '' && selectedRoleId !== '');

// Load collectives and types on mount
// 1000 is a practical upper bound for a personal contacts app.
// If a user ever hits this limit the dropdown will silently omit extras.
const MAX_COLLECTIVES_PAGE_SIZE = 1000;

onMount(async () => {
  try {
    await Promise.all([
      collectives.loadCollectives({ pageSize: MAX_COLLECTIVES_PAGE_SIZE }),
      collectives.loadTypes(),
    ]);

    // Read from store after loading
    const unsubCollectives = collectivesList.subscribe((v) => {
      allCollectives = v;
    });
    const unsubTypes = collectiveTypes.subscribe((v) => {
      types = v;
    });

    // Cleanup subscriptions - we only need the initial values
    unsubCollectives();
    unsubTypes();
  } catch (err) {
    console.error('Failed to load data:', err);
  } finally {
    isLoadingData = false;
  }
});

// Auto-select first role when collective changes
$effect(() => {
  if (selectedCollectiveId && rolesForSelected.length > 0) {
    // Only set if current selection is invalid
    if (!rolesForSelected.find((r) => r.id === selectedRoleId)) {
      selectedRoleId = rolesForSelected[0].id;
    }
  } else {
    selectedRoleId = '';
  }
});

// Load relationship preview when both collective and role are selected
$effect(() => {
  if (selectedCollectiveId && selectedRoleId) {
    loadPreview();
  } else {
    preview = null;
  }
});

async function loadPreview() {
  if (!selectedCollectiveId || !selectedRoleId) return;

  previewAbortController?.abort();
  previewAbortController = new AbortController();
  const signal = previewAbortController.signal;

  isLoadingPreview = true;
  try {
    const result = await previewMemberRelationships(
      selectedCollectiveId,
      { friend_id: friendId, role_id: selectedRoleId },
      { signal },
    );
    if (!signal.aborted) preview = result;
  } catch (err) {
    if (!signal.aborted) {
      console.error('Failed to load preview:', err);
      preview = null;
    }
  } finally {
    if (!signal.aborted) isLoadingPreview = false;
  }
}

async function handleSubmit() {
  if (!isValid) return;

  isSubmitting = true;
  error = null;

  try {
    await collectivesApi.addMember(selectedCollectiveId, {
      friend_id: friendId,
      role_id: selectedRoleId,
      skip_auto_relationships: skipAutoRelationships,
    });
    onSuccess();
    onClose();
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('friendDetail.addToCollective.error');
  } finally {
    isSubmitting = false;
  }
}

function handleCollectiveSelect(collectiveId: string) {
  selectedCollectiveId = collectiveId;
  skipAutoRelationships = false;
}

function handleCollectiveClear() {
  selectedCollectiveId = '';
  skipAutoRelationships = false;
}

function selectRole(roleId: string) {
  selectedRoleId = roleId;
  skipAutoRelationships = false;
}

let roleOptions = $derived(rolesForSelected.map((role) => ({ value: role.id, label: role.label })));
</script>

<DetailEditModal
  title={$i18n.t('friendDetail.addToCollective.title')}
  subtitle={friendDisplayName}
  onClose={() => {
    if (!isSubmitting) onClose();
  }}
>
  {#if isLoadingData}
    <div class="flex justify-center py-8">
      <Spinner size="lg" />
    </div>
  {:else if availableCollectives.length === 0 && allCollectives.length === 0}
    <p class="text-sm text-gray-500 font-body py-4">
      {$i18n.t('friendDetail.addToCollective.noCollectivesAvailable')}
    </p>
  {:else if availableCollectives.length === 0}
    <p class="text-sm text-gray-500 font-body py-4">
      {$i18n.t('friendDetail.addToCollective.alreadyInAll')}
    </p>
  {:else}
    <div class="space-y-4">
      {#if error}
        <AlertBanner variant="error">{error}</AlertBanner>
      {/if}

      <!-- Collective select -->
      <div>
        <label for="collective-select" class={formClasses.label}>
          {$i18n.t('friendDetail.addToCollective.selectCollective')} <span class="text-red-500">*</span>
        </label>
        <CollectiveSearchInput
          id="collective-select"
          collectives={availableCollectives}
          value={selectedCollectiveId}
          disabled={isSubmitting}
          autofocus
          onSelect={handleCollectiveSelect}
          onClear={handleCollectiveClear}
        />
      </div>

      <!-- Role select (only shown when collective is selected) -->
      {#if selectedCollective && rolesForSelected.length > 0}
        <FormSelect
          id="role-select"
          label={$i18n.t('friendDetail.addToCollective.selectRole')}
          bind:value={() => selectedRoleId, selectRole}
          options={roleOptions}
          disabled={isSubmitting}
          required
        />
      {/if}

      <!-- Relationship preview -->
      {#if selectedCollectiveId && selectedRoleId}
        <div>
          <h4 class="text-sm font-body font-medium text-gray-700 mb-2">
            {$i18n.t('collectives.addMember.relationshipPreview')}
          </h4>

          {#if isLoadingPreview}
            <div class="flex justify-center py-4">
              <Spinner />
            </div>
          {:else if preview}
            <RelationshipPreview {preview} />

            {#if preview.relationships.some((r) => !r.alreadyExists)}
              <div class="mt-3">
                <FormCheckbox
                  id="skip-auto-relationships"
                  label={$i18n.t('collectives.addMember.skipRelationships')}
                  bind:checked={skipAutoRelationships}
                  disabled={isSubmitting}
                />
              </div>
            {/if}
          {:else}
            <p class="text-sm text-gray-500 font-body italic py-2">
              {$i18n.t('collectives.addMember.noRelationships')}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    {#if !isLoadingData && availableCollectives.length > 0}
      <Button class="flex-1" loading={isSubmitting} disabled={!isValid} onclick={handleSubmit}>
        {$i18n.t('friendDetail.addToCollective.submit')}
      </Button>

      <Button variant="secondary" disabled={isSubmitting} onclick={onClose}>
        {$i18n.t('common.cancel')}
      </Button>
    {/if}
  {/snippet}
</DetailEditModal>
