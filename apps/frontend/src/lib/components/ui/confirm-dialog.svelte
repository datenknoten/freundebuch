<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import Button from './button.svelte';
import Modal from './modal.svelte';
import type { ButtonVariant } from './styles';

interface Props {
  title: string;
  description: string;
  /** The thing being acted on, echoed back so the user can check it. */
  itemPreview?: string;
  /** Defaults to `common.delete`. */
  confirmLabel?: string;
  confirmVariant?: Extract<ButtonVariant, 'danger' | 'caution' | 'primary'>;
  /** Rejecting keeps the dialog open and shows the reason. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const i18n = createI18n();

let {
  title,
  description,
  itemPreview,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}: Props = $props();

let isConfirming = $state(false);
let error = $state<string | null>(null);

async function handleConfirm() {
  isConfirming = true;
  error = null;
  try {
    await onConfirm();
    onClose();
  } catch (err) {
    error = err instanceof Error ? err.message : $i18n.t('subresources.common.failedToDelete');
    isConfirming = false;
  }
}
</script>

<Modal {title} size="md" closable={!isConfirming} {onClose}>
  <p class="text-gray-600 font-body">{description}</p>

  {#if itemPreview !== undefined}
    <div class="bg-gray-50 rounded-lg p-3 mt-4 font-body text-gray-700">{itemPreview}</div>
  {/if}

  <!-- Only a `danger` confirm is irreversible; a `caution`/`primary` one
       (deactivating a member, resending an invite) can be done again. -->
  {#if confirmVariant === 'danger'}
    <p class="text-sm text-gray-500 font-body mt-4">
      {$i18n.t('subresources.common.cannotBeUndone')}
    </p>
  {/if}

  {#if error !== null}
    <div
      role="alert"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4"
    >
      {error}
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="secondary" class="flex-1" disabled={isConfirming} onclick={onClose}>
      {$i18n.t('common.cancel')}
    </Button>
    <Button
      variant={confirmVariant}
      class="flex-1"
      loading={isConfirming}
      onclick={handleConfirm}
    >
      {confirmLabel ?? $i18n.t('common.delete')}
    </Button>
  {/snippet}
</Modal>
