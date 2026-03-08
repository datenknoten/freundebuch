<script lang="ts">
import type { Email, EmailType } from '$shared';
import SubresourceRow from './SubresourceRow.svelte';

interface Props {
  email: Email;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { email, onEdit, onDelete, isDeleting = false }: Props = $props();

function formatEmailType(type: EmailType): string {
  const typeLabels: Record<EmailType, string> = {
    personal: 'Personal',
    work: 'Work',
    other: 'Other',
  };
  return typeLabels[type] || type;
}
</script>

<SubresourceRow {onEdit} {onDelete} {isDeleting} editLabel="Edit email" deleteLabel="Delete email">
  <div class="flex-1 min-w-0">
    <a
      href="mailto:{email.emailAddress}"
      class="text-forest font-body font-semibold hover:text-forest-light truncate block"
    >
      {email.emailAddress}
    </a>
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {formatEmailType(email.emailType)}
      {#if email.label} - {email.label}{/if}
      {#if email.isPrimary}
        <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
      {/if}
    </span>
  </div>
</SubresourceRow>
