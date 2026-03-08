<script lang="ts">
import type { Address, AddressType } from '$shared';
import SubresourceRow from './SubresourceRow.svelte';

interface Props {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { address, onEdit, onDelete, isDeleting = false }: Props = $props();

function formatAddressType(type: AddressType): string {
  const typeLabels: Record<AddressType, string> = {
    home: 'Home',
    work: 'Work',
    other: 'Other',
  };
  return typeLabels[type] || type;
}

function formatAddress(addr: Address): string[] {
  const lines: string[] = [];
  if (addr.streetLine1) lines.push(addr.streetLine1);
  if (addr.streetLine2) lines.push(addr.streetLine2);
  const cityLine = [addr.postalCode, addr.city].filter(Boolean).join(' ');
  if (cityLine) lines.push(cityLine);
  if (addr.stateProvince) lines.push(addr.stateProvince);
  if (addr.country) lines.push(addr.country);
  return lines;
}

const addressLines = $derived(formatAddress(address));
</script>

<SubresourceRow {onEdit} {onDelete} {isDeleting} editLabel="Edit address" deleteLabel="Delete address">
  <div class="flex-1 min-w-0">
    <div class="flex items-start justify-between gap-2 sm:gap-4">
      <div class="font-body min-w-0">
        {#each addressLines as line}
          <div class="text-gray-900">{line}</div>
        {/each}
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <span class="text-sm text-gray-500 whitespace-nowrap">
          {formatAddressType(address.addressType)}
          {#if address.label} - {address.label}{/if}
        </span>
        {#if address.isPrimary}
          <span class="px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
        {/if}
      </div>
    </div>
  </div>
</SubresourceRow>
