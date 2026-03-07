<script lang="ts">
import { createDirtyTracker, FormCheckbox, FormInput, FormSelect } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { Address, AddressInput, AddressType } from '$shared';
import HierarchicalAddressInput from '../HierarchicalAddressInput.svelte';

const i18n = createI18n();

interface Props {
  initialData?: Address;
  defaultPrimary?: boolean;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, defaultPrimary, disabled = false, onchange }: Props = $props();

// Form state for fields not in HierarchicalAddressInput - initialize with functions to capture initial values
let addressType = $state<AddressType>((() => initialData?.addressType ?? 'home')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? defaultPrimary ?? false)());

// Address data from HierarchicalAddressInput
let addressData = $state<{
  country: string;
  postal_code: string;
  city: string;
  state_province?: string;
  street_line1: string;
  street_line2?: string;
} | null>(null);

createDirtyTracker(
  () => {
    addressType;
    label;
    isPrimary;
    addressData;
  },
  () => onchange,
);

const addressTypeOptions = $derived([
  { value: 'home' as const, label: $i18n.t('subresources.address.types.home') },
  { value: 'work' as const, label: $i18n.t('subresources.address.types.work') },
  { value: 'other' as const, label: $i18n.t('subresources.address.types.other') },
]);

function handleAddressChange(data: {
  country: string;
  postal_code: string;
  city: string;
  state_province?: string;
  street_line1: string;
  street_line2?: string;
  address_type: AddressType;
}) {
  addressData = data;
  onchange?.();
}

export function getData(): AddressInput {
  return {
    country: addressData?.country ?? initialData?.country ?? '',
    postal_code: addressData?.postal_code ?? initialData?.postalCode ?? '',
    city: addressData?.city ?? initialData?.city ?? '',
    state_province: addressData?.state_province ?? initialData?.stateProvince,
    street_line1: addressData?.street_line1 ?? initialData?.streetLine1 ?? '',
    street_line2: addressData?.street_line2 ?? initialData?.streetLine2,
    address_type: addressType,
    label: label.trim() || undefined,
    is_primary: isPrimary,
  };
}

export function isValid(): boolean {
  // At minimum, require a country and some address content
  const data = getData();
  return data.country.length > 0 && !!(data.city || data.street_line1 || data.postal_code);
}

// Parse initial street line 1 to extract street name and house number
function parseStreetLine1(streetLine1?: string): { street: string; houseNumber: string } {
  if (!streetLine1) return { street: '', houseNumber: '' };
  // Try to extract house number from end of street line
  const match = streetLine1.match(/^(.+?)\s+(\d+\S*)$/);
  if (match) {
    return { street: match[1], houseNumber: match[2] };
  }
  return { street: streetLine1, houseNumber: '' };
}

const parsedStreet = (() => parseStreetLine1(initialData?.streetLine1))();
</script>

<div class="space-y-4">
  <FormSelect
    id="address-type"
    label={$i18n.t('subresources.common.type')}
    bind:value={addressType}
    options={addressTypeOptions}
    {disabled}
    autofocus
  />

  <!-- Hierarchical Address Input -->
  <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
    <HierarchicalAddressInput
      initialCountryCode=""
      initialCountryName={initialData?.country ?? ''}
      initialPostalCode={initialData?.postalCode ?? ''}
      initialCity={initialData?.city ?? ''}
      initialState={initialData?.stateProvince ?? ''}
      initialStreet={parsedStreet.street}
      initialHouseNumber={parsedStreet.houseNumber}
      initialStreetLine2={initialData?.streetLine2 ?? ''}
      {addressType}
      {disabled}
      onChange={handleAddressChange}
    />
  </div>

  <FormInput
    id="address-label"
    label={$i18n.t('subresources.common.label')}
    bind:value={label}
    {disabled}
    placeholder="e.g., Main residence, Summer house"
    optional
    optionalText={$i18n.t('common.optional')}
  />

  <FormCheckbox
    id="address-primary"
    label={$i18n.t('subresources.address.primaryAddress')}
    bind:checked={isPrimary}
    {disabled}
  />
</div>
