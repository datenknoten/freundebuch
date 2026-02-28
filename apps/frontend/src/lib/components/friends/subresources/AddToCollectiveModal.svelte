<script lang="ts">
import { onMount } from 'svelte';
import * as collectivesApi from '$lib/api/collectives.js';
import RelationshipPreview from '$lib/components/collectives/RelationshipPreview.svelte';
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
import DetailEditModal from './DetailEditModal.svelte';

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
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('friendDetail.addToCollective.error');
  } finally {
    isSubmitting = false;
  }
}

function handleCollectiveChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  selectedCollectiveId = select.value;
  skipAutoRelationships = false;
}

function handleRoleChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  selectedRoleId = select.value;
  skipAutoRelationships = false;
}

// No-op for DetailEditModal's required onSave (we use hideFooter and our own buttons)
function noop() {
  // intentionally empty - modal uses custom submit buttons
}
</script>

<DetailEditModal
  title={$i18n.t('friendDetail.addToCollective.title')}
  subtitle={friendDisplayName}
  hideFooter={true}
  onSave={noop}
  onClose={() => { if (!isSubmitting) onClose(); }}
>
  {#if isLoadingData}
    <div class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-forest border-t-transparent"></div>
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
        <div
          class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm"
          role="alert"
        >
          {error}
        </div>
      {/if}

      <!-- Collective select -->
      <div>
        <label for="collective-select" class="block text-sm font-body font-medium text-gray-700 mb-1">
          {$i18n.t('friendDetail.addToCollective.selectCollective')} <span class="text-red-500">*</span>
        </label>
        <select
          id="collective-select"
          value={selectedCollectiveId}
          onchange={handleCollectiveChange}
          disabled={isSubmitting}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
        >
          <option value="">{$i18n.t('friendDetail.addToCollective.selectCollectivePlaceholder')}</option>
          {#each availableCollectives as collective (collective.id)}
            <option value={collective.id}>{collective.name} ({collective.type.name})</option>
          {/each}
        </select>
      </div>

      <!-- Role select (only shown when collective is selected) -->
      {#if selectedCollective && rolesForSelected.length > 0}
        <div>
          <label for="role-select" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('friendDetail.addToCollective.selectRole')} <span class="text-red-500">*</span>
          </label>
          <select
            id="role-select"
            value={selectedRoleId}
            onchange={handleRoleChange}
            disabled={isSubmitting}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
          >
            {#each rolesForSelected as role (role.id)}
              <option value={role.id}>{role.label}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Relationship preview -->
      {#if selectedCollectiveId && selectedRoleId}
        <div>
          <h4 class="text-sm font-body font-medium text-gray-700 mb-2">
            {$i18n.t('collectives.addMember.relationshipPreview')}
          </h4>

          {#if isLoadingPreview}
            <div class="flex justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-2 border-forest border-t-transparent"></div>
            </div>
          {:else if preview}
            <RelationshipPreview {preview} />

            {#if preview.relationships.some((r) => !r.alreadyExists)}
              <label class="mt-3 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={skipAutoRelationships}
                  disabled={isSubmitting}
                  class="rounded border-gray-300 text-forest focus:ring-forest"
                />
                <span class="text-sm text-gray-600 font-body">
                  {$i18n.t('collectives.addMember.skipRelationships')}
                </span>
              </label>
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

  <!-- Custom footer buttons -->
  {#if !isLoadingData && availableCollectives.length > 0}
    <div class="flex gap-3 pt-4">
      <button
        type="button"
        onclick={handleSubmit}
        disabled={isSubmitting || !isValid}
        class="flex-1 bg-forest text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {#if isSubmitting}
          <span class="inline-flex items-center gap-2">
            <span class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            {$i18n.t('friendDetail.addToCollective.adding')}
          </span>
        {:else}
          {$i18n.t('friendDetail.addToCollective.submit')}
        {/if}
      </button>

      <button
        type="button"
        onclick={onClose}
        disabled={isSubmitting}
        class="px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {$i18n.t('common.cancel')}
      </button>
    </div>
  {/if}
</DetailEditModal>
