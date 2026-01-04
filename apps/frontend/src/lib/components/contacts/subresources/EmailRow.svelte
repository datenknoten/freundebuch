<script lang="ts">
import type { Email, EmailType } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

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

<!-- Mobile: Swipeable row -->
<div class="sm:hidden">
  <SwipeableRow onSwipeRight={onEdit} onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex-1 min-w-0">
        <a
          href="mailto:{email.emailAddress}"
          class="text-forest font-body font-semibold hover:text-forest-light truncate block"
        >
          {email.emailAddress}
        </a>
        <div class="text-sm text-gray-500">
          {formatEmailType(email.emailType)}
          {#if email.label} - {email.label}{/if}
          {#if email.isPrimary}
            <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
          {/if}
        </div>
      </div>
      <DetailActions
        {onEdit}
        {onDelete}
        {isDeleting}
        editLabel="Edit email"
        deleteLabel="Delete email"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      <a
        href="mailto:{email.emailAddress}"
        class="text-forest font-body font-semibold hover:text-forest-light"
      >
        {email.emailAddress}
      </a>
      <span class="text-sm text-gray-500 ml-2">
        {formatEmailType(email.emailType)}
        {#if email.label} - {email.label}{/if}
        {#if email.isPrimary}
          <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
        {/if}
      </span>
    </div>
    <DetailActions
      {onEdit}
      {onDelete}
      {isDeleting}
      editLabel="Edit email"
      deleteLabel="Delete email"
    />
  </div>
</div>
