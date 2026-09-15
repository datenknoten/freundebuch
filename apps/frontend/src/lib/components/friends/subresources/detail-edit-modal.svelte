<script lang="ts">
import type { Snippet } from 'svelte';
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import AlertBanner from '$lib/components/alert-banner.svelte';
import Button from '$lib/components/ui/button.svelte';
import Modal from '$lib/components/ui/modal.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

interface Props {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string | null;
  isDirty?: boolean;
  /**
   * Wrap the content in a `<form>` (default). Set to false when the children
   * render their own `<form>`, to avoid invalid nested forms. The footer Save
   * button stays functional either way: it submits the form when true, and
   * calls `onSave` directly when false.
   */
  asForm?: boolean;
  /** Required unless the body owns its own actions (`footer={null}`). */
  onSave?: () => void;
  onClose: () => void;
  children: Snippet;
  /**
   * Replaces the default Cancel/Save pair in the pinned footer. `null` drops
   * the footer entirely — for bodies that render their own form and actions
   * (the add-member form), where a modal footer would duplicate them.
   */
  footer?: Snippet | null;
}

let {
  title,
  subtitle,
  isLoading = false,
  error = null,
  isDirty = false,
  asForm = true,
  onSave,
  onClose,
  children,
  footer: footerActions,
}: Props = $props();

const uid = $props.id();
const formId = `detail-edit-form-${uid}`;

let showUnsavedWarning = $state(false);

function handleClose() {
  if (isLoading) return;
  if (isDirty) {
    showUnsavedWarning = true;
    return;
  }
  onClose();
}

function discardChanges() {
  showUnsavedWarning = false;
  onClose();
}

function keepEditing() {
  showUnsavedWarning = false;
}

// Escape, the backdrop and the header X all land here: while the question is
// up they answer it with "keep editing" instead of asking it again.
function handleDismiss() {
  if (showUnsavedWarning) {
    keepEditing();
    return;
  }
  handleClose();
}

function handleSubmit(e: Event) {
  e.preventDefault();
  onSave?.();
}
</script>

{#snippet modalFooter()}
  {#if showUnsavedWarning}
    <Button variant="secondary" class="flex-1" onclick={keepEditing}>
      {$i18n.t('subresources.common.keepEditing')}
    </Button>
    <Button variant="caution" class="flex-1" onclick={discardChanges}>
      {$i18n.t('subresources.common.discardChanges')}
    </Button>
  {:else if footerActions !== undefined && footerActions !== null}
    {@render footerActions()}
  {:else}
    <Button variant="secondary" class="flex-1" disabled={isLoading} onclick={handleClose}>
      {$i18n.t('subresources.common.cancel')}
    </Button>
    <Button
      type={asForm ? 'submit' : 'button'}
      form={asForm ? formId : undefined}
      class="flex-1"
      loading={isLoading}
      onclick={asForm ? undefined : onSave}
    >
      {$i18n.t('subresources.common.save')}
    </Button>
  {/if}
{/snippet}

<Modal
  title={showUnsavedWarning ? $i18n.t('subresources.common.unsavedChangesTitle') : title}
  {subtitle}
  size="md"
  closable={!isLoading}
  onClose={handleDismiss}
  footer={footerActions === null && !showUnsavedWarning ? undefined : modalFooter}
>
  {#if showUnsavedWarning}
    <div class="text-center">
      <ExclamationTriangle class="w-12 h-12 mx-auto text-amber-500 mb-4" strokeWidth="2" />
      <p class="text-gray-600 font-body">{$i18n.t('subresources.common.unsavedChanges')}</p>
    </div>
  {/if}

  <!-- Hidden rather than unmounted: the edit form owns the user's in-progress
       values and the section's `bind:this`, both of which a remount would
       throw away — which is the opposite of "keep editing". -->
  <div class:hidden={showUnsavedWarning}>
    {#if asForm}
      <form id={formId} onsubmit={handleSubmit} class="space-y-4">
        {@render children()}
      </form>
    {:else}
      <div class="space-y-4">
        {@render children()}
      </div>
    {/if}

    {#if error !== null && error.length > 0}
      <div class="mt-4">
        <AlertBanner variant="error">{error}</AlertBanner>
      </div>
    {/if}
  </div>
</Modal>
