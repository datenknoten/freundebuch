<script lang="ts">
import { onMount } from 'svelte';
import { get } from 'svelte/store';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import CollectiveSearchInput from '$lib/components/collectives/CollectiveSearchInput.svelte';
import RelationshipPreview from '$lib/components/collectives/RelationshipPreview.svelte';
import DetailEditModal from '$lib/components/friends/subresources/DetailEditModal.svelte';
import Button from '$lib/components/ui/Button.svelte';
import FormCheckbox from '$lib/components/ui/FormCheckbox.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type {
  CollectiveListItemResponse,
  CollectiveRoleResponse,
  CollectiveTypeResponse,
  RelationshipPreviewResponse,
} from '$shared';

const i18n = createI18n();
const { api, logger, stores } = getAppContext();
const collectives = stores.collectives;

interface Props {
  friendId: string;
  friendDisplayName: string;
  existingCollectiveIds: string[];
  onSuccess: () => void;
  onClose: () => void;
}

let { friendId, friendDisplayName, existingCollectiveIds, onSuccess, onClose }: Props = $props();

let allCollectives = $state<CollectiveListItemResponse[]>([]);
let types = $state<CollectiveTypeResponse[]>([]);
let isLoadingData = $state(true);

let selectedCollectiveId = $state('');
let selectedRoleId = $state('');
let skipAutoRelationships = $state(false);
let preview = $state<RelationshipPreviewResponse | null>(null);
let isLoadingPreview = $state(false);
let isSubmitting = $state(false);
let error = $state<string | null>(null);
let previewAbortController: AbortController | null = null;

let existingSet = $derived(new Set(existingCollectiveIds));
let availableCollectives = $derived(
  allCollectives.filter(
    (c) => existingSet.has(c.id) === false && (c.deletedAt === null || c.deletedAt === ''),
  ),
);

let selectedCollective = $derived(
  availableCollectives.find((c) => c.id === selectedCollectiveId) ?? null,
);

function computeRolesForSelected() {
  if (selectedCollective === null) {
    return [] as CollectiveRoleResponse[];
  }
  const typeId = selectedCollective.type.id;
  const typeObj = types.find((t) => t.id === typeId);
  return typeObj?.roles.toSorted((a, b) => a.sortOrder - b.sortOrder) ?? [];
}

let rolesForSelected = $derived.by(computeRolesForSelected);

let isValid = $derived(selectedCollectiveId !== '' && selectedRoleId !== '');

// 1000 is a practical upper bound for a personal contacts app.
// If a user ever hits this limit the dropdown will silently omit extras.
const MAX_COLLECTIVES_PAGE_SIZE = 1000;

async function loadCollectivesAndTypes() {
  try {
    await Promise.all([
      collectives.loadCollectives({ pageSize: MAX_COLLECTIVES_PAGE_SIZE }),
      collectives.loadTypes(),
    ]);

    allCollectives = get(collectives.list);
    types = get(collectives.types);
  } catch (err) {
    logger.error({ err }, 'Failed to load collectives');
  } finally {
    isLoadingData = false;
  }
}

onMount(loadCollectivesAndTypes);

function autoSelectFirstRole() {
  const firstRole = rolesForSelected[0];
  if (selectedCollectiveId !== '' && firstRole !== undefined) {
    // Only set if current selection is invalid
    if (rolesForSelected.find((r) => r.id === selectedRoleId) === undefined) {
      selectedRoleId = firstRole.id;
    }
  } else {
    selectedRoleId = '';
  }
}

$effect(autoSelectFirstRole);

function syncPreview() {
  if (selectedCollectiveId !== '' && selectedRoleId !== '') {
    void loadPreview();
  } else {
    preview = null;
  }
}

$effect(syncPreview);

async function loadPreview() {
  if (selectedCollectiveId === '' || selectedRoleId === '') {
    return;
  }

  previewAbortController?.abort();
  previewAbortController = new AbortController();
  const signal = previewAbortController.signal;

  isLoadingPreview = true;
  try {
    const result = await api.collectiveMembers.previewMemberRelationships(
      selectedCollectiveId,
      { friendId, roleId: selectedRoleId },
      signal,
    );
    if (signal.aborted === false) {
      preview = result;
    }
  } catch (err) {
    if (signal.aborted === false) {
      logger.error({ err }, 'Failed to load relationship preview');
      preview = null;
    }
  } finally {
    if (signal.aborted === false) {
      isLoadingPreview = false;
    }
  }
}

async function handleSubmit() {
  if (isValid === false) {
    return;
  }

  isSubmitting = true;
  error = null;

  try {
    await api.collectiveMembers.addMember(selectedCollectiveId, {
      friendId,
      roleId: selectedRoleId,
      shouldSkipAutoRelationships: skipAutoRelationships,
    });
    onSuccess();
    onClose();
  } catch (err) {
    error =
      err instanceof Error && err.message !== ''
        ? err.message
        : $i18n.t('friendDetail.addToCollective.error');
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
        <label for="collective-select" class={FORM_CLASSES.label}>
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
