<script lang="ts">
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import { createI18n } from '$lib/i18n/index.js';
import type { Address, AddressType } from '$shared';
import AddressMapModal from './address-map-modal.svelte';
import SubresourceRow from './subresource-row.svelte';

interface Props {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { address, onEdit, onDelete, isDeleting = false }: Props = $props();

const i18n = createI18n();
let showMap = $state(false);

const hasCoordinates = $derived(address.latitude != null && address.longitude != null);

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

function formatAddressLabel(addr: Address): string {
  return formatAddress(addr).join(', ');
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
    {#if hasCoordinates}
      <button
        type="button"
        class="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-forest border border-forest/30 hover:bg-forest hover:text-white hover:border-forest px-2.5 py-1 rounded-full transition-colors"
        onclick={() => (showMap = true)}
        aria-haspopup="dialog"
      >
        <MapPin class="w-3.5 h-3.5" strokeWidth="2" />
        {$i18n.t('subresources.address.showMap')}
      </button>
    {/if}
    {#if address.latitude != null && address.longitude != null}
      <AddressMapModal
        open={showMap}
        latitude={address.latitude}
        longitude={address.longitude}
        addressLabel={formatAddressLabel(address)}
        onClose={() => (showMap = false)}
      />
    {/if}
  </div>
</SubresourceRow>
