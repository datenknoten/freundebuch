<script lang="ts">
import type { Snippet } from 'svelte';
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

function handleClose() {
  if (isLoading) return;
  // A native confirm inside a modal dialog is deliberate: stacking a second
  // <dialog> on top of this one to ask a yes/no question buys nothing.
  if (isDirty && !confirm($i18n.t('subresources.common.unsavedChanges'))) return;
  onClose();
}

function handleSubmit(e: Event) {
  e.preventDefault();
  onSave?.();
}
</script>

{#snippet modalFooter()}
  {#if footerActions !== undefined && footerActions !== null}
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
  {title}
  {subtitle}
  size="md"
  closable={!isLoading}
  onClose={handleClose}
  footer={footerActions === null ? undefined : modalFooter}
>
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
    <div
      role="alert"
      class="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
    >
      {error}
    </div>
  {/if}

</Modal>
