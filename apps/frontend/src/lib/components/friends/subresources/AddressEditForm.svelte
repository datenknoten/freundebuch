<script lang="ts">
import type { Address, AddressInput, AddressType } from '$shared';
import HierarchicalAddressInput from '../HierarchicalAddressInput.svelte';

interface Props {
  initialData?: Address;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state for fields not in HierarchicalAddressInput - initialize with functions to capture initial values
let addressType = $state<AddressType>((() => initialData?.addressType ?? 'home')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? false)());

// Auto-focus action - runs only once on mount
function autoFocus(node: HTMLElement) {
  node.focus();
}

// Address data from HierarchicalAddressInput
let addressData = $state<{
  country: string;
  postal_code: string;
  city: string;
  state_province?: string;
  street_line1: string;
  street_line2?: string;
} | null>(null);

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  addressType;
  label;
  isPrimary;
  addressData;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

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
  <!-- Address Type -->
  <div>
    <label for="address-type" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Type
    </label>
    <select
      use:autoFocus
      id="address-type"
      bind:value={addressType}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="home">Home</option>
      <option value="work">Work</option>
      <option value="other">Other</option>
    </select>
  </div>

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

  <!-- Label (optional) -->
  <div>
    <label for="address-label" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Label <span class="text-gray-400">(optional)</span>
    </label>
    <input
      id="address-label"
      type="text"
      bind:value={label}
      {disabled}
      placeholder="e.g., Main residence, Summer house"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Primary checkbox -->
  <div class="flex items-center gap-2">
    <input
      id="address-primary"
      type="checkbox"
      bind:checked={isPrimary}
      {disabled}
      class="w-4 h-4 text-forest border-gray-300 rounded focus:ring-forest
             disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <label for="address-primary" class="text-sm font-body text-gray-700">
      Primary address
    </label>
  </div>
</div>
