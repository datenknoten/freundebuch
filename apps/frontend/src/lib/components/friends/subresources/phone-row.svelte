<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { Phone, PhoneType } from '$shared';
import SubresourceRow from './subresource-row.svelte';

interface Props {
  phone: Phone;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Keyboard chord that opens this link (e.g. "o 3"), shown as a hint on click */
  shortcutHint?: string;
}

let { phone, onEdit, onDelete, isDeleting = false, shortcutHint }: Props = $props();

const i18n = createI18n();

function phoneTypeLabel(type: PhoneType): string {
  return $i18n.t(`subresources.phone.types.${type}`);
}
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.phone.editAria')}
  deleteLabel={$i18n.t('subresources.phone.deleteAria')}
>
  <div class="flex-1 min-w-0">
    <a
      href="tel:{phone.phoneNumber}"
      class="text-forest font-body font-semibold hover:text-forest-light"
      data-shortcut={shortcutHint}
      data-shortcut-label={shortcutHint ? 'shortcuts.panels.openLink' : undefined}
    >
      {phone.phoneNumber}
    </a>
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {phoneTypeLabel(phone.phoneType)}
      {#if phone.label} - {phone.label}{/if}
      {#if phone.isPrimary}
        <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">
          {$i18n.t('subresources.common.primary')}
        </span>
      {/if}
    </span>
  </div>
</SubresourceRow>
