<script lang="ts">
import { get } from 'svelte/store';
import type { AddressData } from '$lib/api/address-data.js';
import { getAppContext } from '$lib/app-context.js';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormCheckbox from '$lib/components/ui/FormCheckbox.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import { type AddressResponse, type AddressType, isCountryCode } from '$shared';
import HierarchicalAddressInput from '../HierarchicalAddressInput.svelte';

const defaultCountry = getAppContext().stores.auth.defaultCountry;

const i18n = createI18n();

interface Props {
  initialData?: AddressResponse;
  defaultPrimary?: boolean;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, defaultPrimary, disabled = false, onchange }: Props = $props();

// Form state for fields not in HierarchicalAddressInput - initialize with functions to capture initial values
let addressType = $state<AddressType>((() => initialData?.addressType ?? 'home')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? defaultPrimary ?? false)());
const initialCountryCode = (() => {
  if (initialData === undefined) return get(defaultCountry) ?? '';
  const stored = initialData.country;
  return stored !== undefined && isCountryCode(stored) ? stored : '';
})();

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

export function getData() {
  return {
    country: addressData?.country ?? initialCountryCode,
    postalCode: addressData?.postal_code ?? initialData?.postalCode ?? '',
    city: addressData?.city ?? initialData?.city ?? '',
    stateProvince: addressData?.state_province ?? initialData?.stateProvince,
    streetLine1: addressData?.street_line1 ?? initialData?.streetLine1 ?? '',
    streetLine2: addressData?.street_line2 ?? initialData?.streetLine2,
    addressType,
    label: label.trim() || undefined,
    isPrimary,
  } satisfies AddressData;
}

export function isValid(): boolean {
  // At minimum, require a country and some address content
  const data = getData();
  return (
    data.country !== undefined &&
    isCountryCode(data.country) &&
    !!(data.city || data.streetLine1 || data.postalCode)
  );
}

// Parse initial street line 1 to extract street name and house number
function parseStreetLine1(streetLine1?: string): { street: string; houseNumber: string } {
  if (!streetLine1) return { street: '', houseNumber: '' };
  // Try to extract house number from end of street line
  const match = streetLine1.match(/^(.+?)\s+(\d+\S*)$/);
  if (match) {
    return { street: match[1] ?? '', houseNumber: match[2] ?? '' };
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
      initialCountryCode={initialCountryCode}
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
    placeholder={$i18n.t('subresources.address.placeholder.label')}
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
