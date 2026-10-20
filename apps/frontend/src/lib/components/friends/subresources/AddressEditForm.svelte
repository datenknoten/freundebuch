<script lang="ts">
import { get } from 'svelte/store';
import type { AddressData } from '$lib/api/address-data.js';
import { getAppContext } from '$lib/app-context.js';
import HierarchicalAddressInput from '$lib/components/friends/HierarchicalAddressInput.svelte';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormCheckbox from '$lib/components/ui/FormCheckbox.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import { type AddressResponse, type AddressType, isCountryCode } from '$shared';

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
function resolveInitialCountryCode() {
  if (initialData === undefined) {
    return get(defaultCountry) ?? '';
  }
  const stored = initialData.country;
  return stored !== undefined && isCountryCode(stored) === true ? stored : '';
}

const initialCountryCode = resolveInitialCountryCode();

// Address data from HierarchicalAddressInput
let addressData = $state<{
  country: string;
  postal_code: string;
  city: string;
  state_province?: string;
  street_line1: string;
  street_line2?: string;
} | null>(null);

function trackDirtyFields() {
  addressType;
  label;
  isPrimary;
  addressData;
}

createDirtyTracker(trackDirtyFields, () => onchange);

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
  const trimmedLabel = label.trim();
  return {
    country: addressData?.country ?? initialCountryCode,
    postalCode: addressData?.postal_code ?? initialData?.postalCode ?? '',
    city: addressData?.city ?? initialData?.city ?? '',
    stateProvince: addressData?.state_province ?? initialData?.stateProvince,
    streetLine1: addressData?.street_line1 ?? initialData?.streetLine1 ?? '',
    streetLine2: addressData?.street_line2 ?? initialData?.streetLine2,
    addressType,
    label: trimmedLabel === '' ? undefined : trimmedLabel,
    isPrimary,
  } satisfies AddressData;
}

export function isValid() {
  // At minimum, require a country and some address content
  const data = getData();
  return (
    data.country !== undefined &&
    isCountryCode(data.country) === true &&
    (data.city !== '' || data.streetLine1 !== '' || data.postalCode !== '')
  );
}

function parseStreetLine1(streetLine1?: string) {
  if (streetLine1 === undefined || streetLine1 === '') {
    return { street: '', houseNumber: '' };
  }
  const match = streetLine1.match(/^(.+?)\s+(\d+\S*)$/);
  if (match !== null) {
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
