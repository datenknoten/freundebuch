<script lang="ts">
import type { DateInput, DateType, FriendDate } from '$shared';

interface Props {
  initialData?: FriendDate;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let dateValue = $state((() => initialData?.dateValue ?? '')());
let yearKnown = $state((() => initialData?.yearKnown ?? true)());
let dateType = $state<DateType>((() => initialData?.dateType ?? 'birthday')());
let label = $state((() => initialData?.label ?? '')());

// Auto-focus action - runs only once on mount
function autoFocus(node: HTMLElement) {
  node.focus();
}

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  dateValue;
  yearKnown;
  dateType;
  label;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

export function getData(): DateInput {
  return {
    date_value: dateValue,
    year_known: yearKnown,
    date_type: dateType,
    label: label.trim() || undefined,
  };
}

export function isValid(): boolean {
  return dateValue.trim().length > 0;
}
</script>

<div class="space-y-4">
  <!-- Date Value -->
  <div>
    <label for="date-value" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Date <span class="text-red-500">*</span>
    </label>
    <input
      use:autoFocus
      id="date-value"
      type="date"
      bind:value={dateValue}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
      required
    />
  </div>

  <!-- Date Type -->
  <div>
    <label for="date-type" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Type
    </label>
    <select
      id="date-type"
      bind:value={dateType}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="birthday">Birthday</option>
      <option value="anniversary">Anniversary</option>
      <option value="other">Other</option>
    </select>
  </div>

  <!-- Label (optional) -->
  <div>
    <label for="date-label" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Label <span class="text-gray-400">(optional)</span>
    </label>
    <input
      id="date-label"
      type="text"
      bind:value={label}
      {disabled}
      placeholder="e.g., Wedding anniversary, First met"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Year Known checkbox -->
  <div class="flex items-center gap-2">
    <input
      id="date-year-known"
      type="checkbox"
      bind:checked={yearKnown}
      {disabled}
      class="w-4 h-4 text-forest border-gray-300 rounded focus:ring-forest
             disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <label for="date-year-known" class="text-sm font-body text-gray-700">
      Year is known
    </label>
  </div>
</div>
