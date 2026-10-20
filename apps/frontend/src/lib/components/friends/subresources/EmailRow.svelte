<script lang="ts">
import { CHIP_CLASSES } from '$lib/components/ui/chip-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type { EmailResponse, EmailType } from '$shared';
import SubresourceRow from './SubresourceRow.svelte';

interface Props {
  email: EmailResponse;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Keyboard chord that opens this link (e.g. "o 3"), shown as a hint on click */
  shortcutHint?: string;
}

let { email, onEdit, onDelete, isDeleting = false, shortcutHint }: Props = $props();

const i18n = createI18n();

function emailTypeLabel(type: EmailType): string {
  return $i18n.t(`subresources.email.types.${type}`);
}
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.email.editAria')}
  deleteLabel={$i18n.t('subresources.email.deleteAria')}
>
  <div class="flex-1 min-w-0">
    <a
      href="mailto:{email.emailAddress}"
      class="text-forest font-body font-semibold hover:text-forest-light truncate block"
      data-shortcut={shortcutHint}
      data-shortcut-label={shortcutHint ? 'shortcuts.panels.openLink' : undefined}
    >
      {email.emailAddress}
    </a>
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {emailTypeLabel(email.emailType)}
      {#if email.label} - {email.label}{/if}
      {#if email.isPrimary}
        <span class="ml-1 {CHIP_CLASSES.base} {CHIP_CLASSES.forest}">
          {$i18n.t('subresources.common.primary')}
        </span>
      {/if}
    </span>
  </div>
</SubresourceRow>
