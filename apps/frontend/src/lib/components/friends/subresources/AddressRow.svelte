<script lang="ts">
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import { getAppContext } from '$lib/app-context.js';
import AddressMapModal from '$lib/components/friends/subresources/AddressMapModal.svelte';
import SubresourceRow from '$lib/components/friends/subresources/SubresourceRow.svelte';
import Button from '$lib/components/ui/Button.svelte';
import { CHIP_CLASSES } from '$lib/components/ui/chip-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import { type AddressResponse, type AddressType, countryDisplayName } from '$shared';

const currentLanguage = getAppContext().stores.locale.currentLanguage;

interface Props {
  address: AddressResponse;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { address, onEdit, onDelete, isDeleting = false }: Props = $props();

const i18n = createI18n();
let showMap = $state(false);

const hasCoordinates = $derived(address.latitude != null && address.longitude != null);

function addressTypeLabel(type: AddressType) {
  return $i18n.t(`subresources.address.types.${type}`);
}

function isNonEmpty(part: string | undefined) {
  return part !== undefined && part !== '';
}

function formatAddress(addr: AddressResponse, language: string) {
  const lines: string[] = [];
  if (addr.streetLine1 !== undefined && addr.streetLine1 !== '') {
    lines.push(addr.streetLine1);
  }
  if (addr.streetLine2 !== undefined && addr.streetLine2 !== '') {
    lines.push(addr.streetLine2);
  }
  const cityLine = [addr.postalCode, addr.city].filter(isNonEmpty).join(' ');
  if (cityLine !== '') {
    lines.push(cityLine);
  }
  if (addr.stateProvince !== undefined && addr.stateProvince !== '') {
    lines.push(addr.stateProvince);
  }
  if (addr.country !== undefined && addr.country !== '') {
    lines.push(countryDisplayName(addr.country, language));
  }
  return lines;
}

function formatAddressLabel(addr: AddressResponse, language: string) {
  return formatAddress(addr, language).join(', ');
}

const addressLines = $derived(formatAddress(address, $currentLanguage));
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.address.editAria')}
  deleteLabel={$i18n.t('subresources.address.deleteAria')}
>
  <div class="flex-1 min-w-0">
    <div class="flex items-start justify-between gap-2 sm:gap-4">
      <div class="font-body min-w-0">
        {#each addressLines as line}
          <div class="text-gray-900">{line}</div>
        {/each}
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <span class="text-sm text-gray-500 whitespace-nowrap">
          {addressTypeLabel(address.addressType)}
          {#if address.label} - {address.label}{/if}
        </span>
        {#if address.isPrimary}
          <span class="{CHIP_CLASSES.base} {CHIP_CLASSES.forest}">
            {$i18n.t('subresources.common.primary')}
          </span>
        {/if}
      </div>
    </div>
    {#if hasCoordinates}
      <Button
        variant="secondary"
        size="xs"
        class="mt-3"
        onclick={() => (showMap = true)}
        aria-haspopup="dialog"
      >
        <MapPin class="w-3.5 h-3.5" strokeWidth="2" />
        {$i18n.t('subresources.address.showMap')}
      </Button>
    {/if}
    {#if showMap && address.latitude != null && address.longitude != null}
      <AddressMapModal
        latitude={address.latitude}
        longitude={address.longitude}
        addressLabel={formatAddressLabel(address, $currentLanguage)}
        onClose={() => (showMap = false)}
      />
    {/if}
  </div>
</SubresourceRow>
