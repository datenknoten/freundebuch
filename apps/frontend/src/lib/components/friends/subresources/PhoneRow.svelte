<script lang="ts">
import type { Phone, PhoneType } from '$shared';
import SubresourceRow from './SubresourceRow.svelte';

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

<SubresourceRow {onEdit} {onDelete} {isDeleting} editLabel="Edit phone" deleteLabel="Delete phone">
  <div class="flex-1 min-w-0">
    <a
      href="tel:{phone.phoneNumber}"
      class="text-forest font-body font-semibold hover:text-forest-light"
    >
      {phone.phoneNumber}
    </a>
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {formatPhoneType(phone.phoneType)}
      {#if phone.label} - {phone.label}{/if}
      {#if phone.isPrimary}
        <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
      {/if}
    </span>
  </div>
</SubresourceRow>
