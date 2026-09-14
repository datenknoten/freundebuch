<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { autoFocus } from '$lib/actions/auto-focus';
import { Button, formClasses, Modal } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { circles, circlesList } from '$lib/stores/circles';
import type { Circle, CircleInput } from '$shared';
import { CIRCLE_COLORS } from '$shared';
import CircleChip from './circle-chip.svelte';

const i18n = createI18n();

interface Props {
  circle?: Circle | null;
  onClose: () => void;
}

let { circle = null, onClose }: Props = $props();

const isEditing = $derived(!!circle);

const uid = $props.id();
const formId = `circle-form-${uid}`;

// Form state
let formName = $state('');
let formColor = $state<string>(CIRCLE_COLORS[5]);
let formParentId = $state<string | null>(null);
let formError = $state('');
let isSubmitting = $state(false);
let showUnsavedWarning = $state(false);

// Track which circle we initialized for (to detect when circle prop changes)
let initializedForCircleId = $state<string | null | undefined>(undefined);

// Initialize/re-initialize form when circle prop changes
$effect(() => {
  const circleId = circle?.id ?? null;
  if (initializedForCircleId !== circleId) {
    formName = circle?.name ?? '';
    formColor = circle?.color ?? CIRCLE_COLORS[5];
    formParentId = circle?.parentCircleId ?? null;
    formError = '';
    initializedForCircleId = circleId;
  }
});

// Get valid parent options (exclude the current circle and its children to prevent circular references)
function getParentOptionsTree(): Array<{ circle: Circle; depth: number }> {
  const currentCircleId = circle?.id ?? null;

  function getDescendantIds(parentId: string): Set<string> {
    const ids = new Set<string>();
    for (const c of $circlesList) {
      if (c.parentCircleId === parentId) {
        ids.add(c.id);
        const childIds = getDescendantIds(c.id);
        for (const id of childIds) {
          ids.add(id);
        }
      }
    }
    return ids;
  }

  const excludeIds = currentCircleId ? getDescendantIds(currentCircleId) : new Set<string>();
  if (currentCircleId) excludeIds.add(currentCircleId);

  function buildTree(
    parentId: string | null,
    depth: number,
  ): Array<{ circle: Circle; depth: number }> {
    const result: Array<{ circle: Circle; depth: number }> = [];
    const children = $circlesList.filter(
      (c) => c.parentCircleId === parentId && !excludeIds.has(c.id),
    );

    for (const child of children) {
      result.push({ circle: child, depth });
      result.push(...buildTree(child.id, depth + 1));
    }
    return result;
  }

  return buildTree(null, 0);
}

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  formError = '';

  if (!formName.trim()) {
    formError = 'Circle name is required';
    return;
  }

  isSubmitting = true;

  try {
    const input: CircleInput = {
      name: formName.trim(),
      color: formColor,
      parent_circle_id: formParentId,
    };

    if (isEditing && circle) {
      await circles.updateCircle(circle.id, input);
    } else {
      await circles.createCircle(input);
    }

    onClose();
  } catch (err) {
    formError = (err as Error)?.message || 'Failed to save circle';
  } finally {
    isSubmitting = false;
  }
}

// Check if form has unsaved changes
function isDirty(): boolean {
  if (isEditing) {
    return (
      formName !== circle?.name ||
      formColor !== circle?.color ||
      formParentId !== circle?.parentCircleId
    );
  }
  return formName.trim() !== '';
}

function handleClose() {
  if (isSubmitting) return;

  if (isDirty()) {
    showUnsavedWarning = true;
  } else {
    onClose();
  }
}

function confirmClose() {
  showUnsavedWarning = false;
  onClose();
}

function cancelClose() {
  showUnsavedWarning = false;
}

// Escape, the backdrop and the header X all land here: while the unsaved-changes
// question is up they answer it with "keep editing" instead of asking again.
function handleDismiss() {
  if (showUnsavedWarning) {
    cancelClose();
    return;
  }
  handleClose();
}
</script>

{#snippet formFooter()}
  <Button variant="secondary" class="flex-1" onclick={handleClose} disabled={isSubmitting}>
    {$i18n.t('common.cancel')}
  </Button>
  <Button type="submit" form={formId} class="flex-1" loading={isSubmitting}>
    {isEditing ? $i18n.t('circles.form.saveChanges') : $i18n.t('circles.form.createCircle')}
  </Button>
{/snippet}

{#snippet warningFooter()}
  <Button variant="secondary" class="flex-1" onclick={cancelClose}>
    {$i18n.t('circles.unsavedChanges.keepEditing')}
  </Button>
  <Button variant="caution" class="flex-1" onclick={confirmClose}>
    {$i18n.t('circles.unsavedChanges.discard')}
  </Button>
{/snippet}

<Modal
  title={isEditing ? $i18n.t('circles.form.title.edit') : $i18n.t('circles.form.title.new')}
  size="md"
  closable={!isSubmitting}
  onClose={handleDismiss}
  footer={showUnsavedWarning ? warningFooter : formFooter}
>
  {#if showUnsavedWarning}
    <div class="text-center">
      <ExclamationTriangle class="w-12 h-12 mx-auto text-amber-500 mb-4" strokeWidth="2" />
      <h3 class="text-lg font-heading text-gray-900 mb-2">
        {$i18n.t('circles.unsavedChanges.title')}
      </h3>
      <p class="text-gray-600 font-body">{$i18n.t('circles.unsavedChanges.message')}</p>
    </div>
  {:else}
    <form id={formId} onsubmit={handleSubmit} class="space-y-4">
      <!-- Name -->
      <div>
        <label for="circle-name" class={formClasses.label}>
          {$i18n.t('circles.form.name')}
        </label>
        <input
          use:autoFocus
          type="text"
          id="circle-name"
          bind:value={formName}
          placeholder={$i18n.t('circles.form.namePlaceholder')}
          maxlength="100"
          required
          disabled={isSubmitting}
          class={formClasses.input}
        />
      </div>

      <!-- Color -->
      <fieldset>
        <legend class={formClasses.label}>
          {$i18n.t('circles.form.color')}
        </legend>
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-label={$i18n.t('aria.circleColor')}>
          {#each CIRCLE_COLORS as color}
            <button
              type="button"
              onclick={() => formColor = color}
              disabled={isSubmitting}
              class="w-8 h-8 rounded-full border-2 transition-all {formColor === color ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'}"
              style:background-color={color}
              aria-label={$i18n.t('aria.selectColor', { color })}
              aria-pressed={formColor === color}
              title={color}
            ></button>
          {/each}
        </div>
      </fieldset>

      <!-- Parent Circle -->
      <div>
        <label for="parent-circle" class={formClasses.label}>
          {$i18n.t('circles.form.parentCircleOptional')}
        </label>
        <select
          id="parent-circle"
          bind:value={formParentId}
          disabled={isSubmitting}
          class={formClasses.input}
        >
          <option value={null}>{$i18n.t('circles.form.noParent')}</option>
          {#each getParentOptionsTree() as { circle: parentCircle, depth }}
            <option value={parentCircle.id}>{'\u00A0\u00A0\u00A0'.repeat(depth)}{parentCircle.name}</option>
          {/each}
        </select>
        <p class="mt-1 text-xs font-body text-gray-500">
          {$i18n.t('circles.form.parentHelp')}
        </p>
      </div>

      <!-- Preview -->
      <div>
        <span class={formClasses.label}>
          {$i18n.t('circles.form.preview')}
        </span>
        <CircleChip circle={{ id: 'preview', name: formName || $i18n.t('circles.form.defaultName'), color: formColor }} size="md" />
      </div>

      <!-- Error message -->
      {#if formError}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {formError}
        </div>
      {/if}
    </form>
  {/if}
</Modal>
