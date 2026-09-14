<script lang="ts">
import { onMount } from 'svelte';
import CircleChip from '$lib/components/circles/circle-chip.svelte';
import { createDirtyTracker, FormSelect, Spinner } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { circles, circlesList } from '$lib/stores/circles';
import type { Circle, CircleSummary } from '$shared';

const i18n = createI18n();

interface Props {
  /** Circles the owner (friend or collective) already belongs to. */
  existingCircles?: CircleSummary[];
  disabled?: boolean;
  onchange?: () => void;
}

let { existingCircles = [], disabled = false, onchange }: Props = $props();

// Form state
let selectedCircleId = $state('');

// Load circles on mount if not already loaded
onMount(() => {
  if ($circles.circles.length === 0) {
    circles.loadCircles();
  }
});

// Get available circles (exclude already assigned ones)
let existingCircleIds = $derived(new Set(existingCircles.map((c) => c.id)));
let availableCircles = $derived($circlesList.filter((c) => !existingCircleIds.has(c.id)));

// Build tree structure for dropdown with indentation
let availableCirclesTree = $derived.by(() => {
  function buildTree(
    parentId: string | null,
    depth: number,
  ): Array<{ circle: Circle; depth: number }> {
    const result: Array<{ circle: Circle; depth: number }> = [];
    const children = availableCircles.filter((c) => c.parentCircleId === parentId);

    for (const child of children) {
      result.push({ circle: child, depth });
      result.push(...buildTree(child.id, depth + 1));
    }
    return result;
  }

  return buildTree(null, 0);
});

let circleOptions = $derived(
  availableCirclesTree.map(({ circle, depth }) => ({
    value: circle.id,
    label: `${'\u00A0\u00A0\u00A0'.repeat(depth)}${circle.name}`,
  })),
);

createDirtyTracker(
  () => {
    selectedCircleId;
  },
  () => onchange,
);

export function getData(): { circleId: string } {
  return {
    circleId: selectedCircleId,
  };
}

export function isValid(): boolean {
  return selectedCircleId.length > 0;
}

export function getSelectedCircle(): Circle | undefined {
  return availableCircles.find((c) => c.id === selectedCircleId);
}
</script>

<div class="space-y-4">
  {#if $circles.isLoading}
    <div class="flex items-center gap-2 text-gray-500 font-body">
      <Spinner size="sm" tone="current" />
      {$i18n.t('subresources.circle.loading')}
    </div>
  {:else if availableCircles.length === 0}
    <div class="text-gray-500 font-body">
      {#if $circlesList.length === 0}
        <p>{$i18n.t('subresources.circle.noneCreated')}</p>
        <p class="text-sm mt-1">{$i18n.t('subresources.circle.noneCreatedHint')}</p>
      {:else}
        <p>{$i18n.t('subresources.circle.allAssigned')}</p>
      {/if}
    </div>
  {:else}
    <FormSelect
      id="circle-select"
      label={$i18n.t('subresources.circle.select')}
      bind:value={selectedCircleId}
      options={circleOptions}
      {disabled}
      required
      autofocus
      placeholderOption={$i18n.t('subresources.circle.selectPlaceholder')}
    />

    <!-- Preview of selected circle -->
    {#if selectedCircleId}
      {@const selectedCircle = availableCircles.find((c) => c.id === selectedCircleId)}
      {#if selectedCircle}
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 font-body">{$i18n.t('subresources.circle.preview')}</span>
          <CircleChip circle={selectedCircle} size="md" />
        </div>
      {/if}
    {/if}
  {/if}
</div>
