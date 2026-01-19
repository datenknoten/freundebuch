<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import { createI18n } from '$lib/i18n/index.js';
import type { DateInput, DateType, FriendDate } from '$shared';

const i18n = createI18n();

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
      {$i18n.t('subresources.date.date')} <span class="text-red-500">*</span>
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
      {$i18n.t('subresources.common.type')}
    </label>
    <select
      id="date-type"
      bind:value={dateType}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="birthday">{$i18n.t('subresources.date.types.birthday')}</option>
      <option value="anniversary">{$i18n.t('subresources.date.types.anniversary')}</option>
      <option value="other">{$i18n.t('subresources.date.types.other')}</option>
    </select>
  </div>

  <!-- Label (optional) -->
  <div>
    <label for="date-label" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.common.label')} <span class="text-gray-400">({$i18n.t('common.optional')})</span>
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
      {$i18n.t('subresources.date.yearKnown')}
    </label>
  </div>
</div>
