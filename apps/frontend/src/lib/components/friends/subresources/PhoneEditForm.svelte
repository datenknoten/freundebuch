<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import type { Phone, PhoneInput, PhoneType } from '$shared';

interface Props {
  initialData?: Phone;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let phoneNumber = $state((() => initialData?.phoneNumber ?? '')());
let phoneType = $state<PhoneType>((() => initialData?.phoneType ?? 'mobile')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? false)());

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  // Track all fields
  phoneNumber;
  phoneType;
  label;
  isPrimary;
  // Skip initial run, only notify on actual changes
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

export function getData(): PhoneInput {
  return {
    phone_number: phoneNumber.trim(),
    phone_type: phoneType,
    label: label.trim() || undefined,
    is_primary: isPrimary,
  };
}

export function isValid(): boolean {
  return phoneNumber.trim().length > 0;
}
</script>

<div class="space-y-4">
  <!-- Phone Number -->
  <div>
    <label for="phone-number" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Phone Number <span class="text-red-500">*</span>
    </label>
    <input
      use:autoFocus
      id="phone-number"
      type="tel"
      bind:value={phoneNumber}
      {disabled}
      placeholder="+1 555-123-4567"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
      required
    />
  </div>

  <!-- Phone Type -->
  <div>
    <label for="phone-type" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Type
    </label>
    <select
      id="phone-type"
      bind:value={phoneType}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="mobile">Mobile</option>
      <option value="home">Home</option>
      <option value="work">Work</option>
      <option value="fax">Fax</option>
      <option value="other">Other</option>
    </select>
  </div>

  <!-- Label (optional) -->
  <div>
    <label for="phone-label" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Label <span class="text-gray-400">(optional)</span>
    </label>
    <input
      id="phone-label"
      type="text"
      bind:value={label}
      {disabled}
      placeholder="e.g., Personal cell, Work direct"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Primary checkbox -->
  <div class="flex items-center gap-2">
    <input
      id="phone-primary"
      type="checkbox"
      bind:checked={isPrimary}
      {disabled}
      class="w-4 h-4 text-forest border-gray-300 rounded focus:ring-forest
             disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <label for="phone-primary" class="text-sm font-body text-gray-700">
      Primary phone number
    </label>
  </div>
</div>
