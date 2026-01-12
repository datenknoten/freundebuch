<script lang="ts">
import type { Phone, PhoneType } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  phone: Phone;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { phone, onEdit, onDelete, isDeleting = false }: Props = $props();

function formatPhoneType(type: PhoneType): string {
  const typeLabels: Record<PhoneType, string> = {
    mobile: 'Mobile',
    home: 'Home',
    work: 'Work',
    fax: 'Fax',
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
          href="tel:{phone.phoneNumber}"
          class="text-forest font-body font-semibold hover:text-forest-light"
        >
          {phone.phoneNumber}
        </a>
        <div class="text-sm text-gray-500">
          {formatPhoneType(phone.phoneType)}
          {#if phone.label} - {phone.label}{/if}
          {#if phone.isPrimary}
            <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
          {/if}
        </div>
      </div>
      <DetailActions
        {onEdit}
        {onDelete}
        {isDeleting}
        editLabel="Edit phone"
        deleteLabel="Delete phone"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      <a
        href="tel:{phone.phoneNumber}"
        class="text-forest font-body font-semibold hover:text-forest-light"
      >
        {phone.phoneNumber}
      </a>
      <span class="text-sm text-gray-500 ml-2">
        {formatPhoneType(phone.phoneType)}
        {#if phone.label} - {phone.label}{/if}
        {#if phone.isPrimary}
          <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
        {/if}
      </span>
    </div>
    <DetailActions
      {onEdit}
      {onDelete}
      {isDeleting}
      editLabel="Edit phone"
      deleteLabel="Delete phone"
    />
  </div>
</div>
