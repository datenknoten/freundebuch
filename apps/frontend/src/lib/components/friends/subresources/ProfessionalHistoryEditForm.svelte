<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import { createI18n } from '$lib/i18n/index.js';
import type { ProfessionalHistory, ProfessionalHistoryInput } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: ProfessionalHistory;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let jobTitle = $state((() => initialData?.jobTitle ?? '')());
let organization = $state((() => initialData?.organization ?? '')());
let department = $state((() => initialData?.department ?? '')());
let notes = $state((() => initialData?.notes ?? '')());
let fromMonth = $state((() => initialData?.fromMonth ?? new Date().getMonth() + 1)());
let fromYear = $state((() => initialData?.fromYear ?? new Date().getFullYear())());
let toMonth = $state((() => initialData?.toMonth ?? null)() as number | null);
let toYear = $state((() => initialData?.toYear ?? null)() as number | null);
let isPrimary = $state((() => initialData?.isPrimary ?? false)());
let isCurrentPosition = $state(
  (() => !initialData || (initialData.toMonth === null && initialData.toYear === null))(),
);

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  jobTitle;
  organization;
  department;
  notes;
  fromMonth;
  fromYear;
  toMonth;
  toYear;
  isPrimary;
  isCurrentPosition;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

// When toggling current position, clear or set the end date
$effect(() => {
  if (isCurrentPosition) {
    toMonth = null;
    toYear = null;
  } else if (toMonth === null && toYear === null) {
    // Default to current month/year when unchecking
    toMonth = new Date().getMonth() + 1;
    toYear = new Date().getFullYear();
  }
});

export function getData(): ProfessionalHistoryInput {
  return {
    job_title: jobTitle.trim() || null,
    organization: organization.trim() || null,
    department: department.trim() || null,
    notes: notes.trim() || null,
    from_month: fromMonth,
    from_year: fromYear,
    to_month: isCurrentPosition ? null : toMonth,
    to_year: isCurrentPosition ? null : toYear,
    is_primary: isPrimary,
  };
}

export function isValid(): boolean {
  // At least job_title or organization must be provided
  const hasContent = jobTitle.trim().length > 0 || organization.trim().length > 0;
  // from_month and from_year are required and must be valid
  const hasValidFromDate = fromMonth >= 1 && fromMonth <= 12 && fromYear > 0;
  // If not current position, to dates must be valid and >= from dates
  const hasValidToDate =
    isCurrentPosition ||
    (toMonth !== null &&
      toYear !== null &&
      toMonth >= 1 &&
      toMonth <= 12 &&
      toYear > 0 &&
      (toYear > fromYear || (toYear === fromYear && toMonth >= fromMonth)));
  return hasContent && hasValidFromDate && hasValidToDate;
}

// Month names - using derived for reactive translations
const monthKeys = [
  'months.january',
  'months.february',
  'months.march',
  'months.april',
  'months.may',
  'months.june',
  'months.july',
  'months.august',
  'months.september',
  'months.october',
  'months.november',
  'months.december',
];

let months = $derived(monthKeys.map((key, index) => ({ value: index + 1, label: $i18n.t(key) })));

// Generate year options (current year back to 50 years ago, and 5 years ahead)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 60 }, (_, i) => currentYear + 5 - i);
</script>

<div class="space-y-4">
  <!-- Job Title -->
  <div>
    <label for="prof-job-title" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('employment.jobTitle')}
    </label>
    <input
      use:autoFocus
      id="prof-job-title"
      type="text"
      bind:value={jobTitle}
      {disabled}
      placeholder={$i18n.t('employment.jobTitlePlaceholder')}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Organization -->
  <div>
    <label for="prof-organization" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('employment.organization')}
    </label>
    <input
      id="prof-organization"
      type="text"
      bind:value={organization}
      {disabled}
      placeholder={$i18n.t('employment.organizationPlaceholder')}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Department -->
  <div>
    <label for="prof-department" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('employment.department')}
    </label>
    <input
      id="prof-department"
      type="text"
      bind:value={department}
      {disabled}
      placeholder={$i18n.t('employment.departmentPlaceholder')}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- From Date -->
  <fieldset>
    <legend class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('employment.startDate')} <span class="text-red-500">*</span>
    </legend>
    <div class="grid grid-cols-2 gap-2">
      <select
        bind:value={fromMonth}
        {disabled}
        aria-label="Start month"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
               font-body disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#each months as { value, label }}
          <option {value}>{label}</option>
        {/each}
      </select>
      <select
        bind:value={fromYear}
        {disabled}
        aria-label="Start year"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
               font-body disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#each years as year}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </div>
  </fieldset>

  <!-- Current Position Checkbox -->
  <div class="flex items-center">
    <input
      id="prof-current"
      type="checkbox"
      bind:checked={isCurrentPosition}
      {disabled}
      class="h-4 w-4 text-forest focus:ring-forest border-gray-300 rounded disabled:opacity-50"
    />
    <label for="prof-current" class="ml-2 block text-sm font-body text-gray-700">
      {$i18n.t('employment.currentlyWorkHere')}
    </label>
  </div>

  <!-- To Date (only shown if not current position) -->
  {#if !isCurrentPosition}
    <fieldset>
      <legend class="block text-sm font-body font-medium text-gray-700 mb-1">
        {$i18n.t('employment.endDate')} <span class="text-red-500">*</span>
      </legend>
      <div class="grid grid-cols-2 gap-2">
        <select
          bind:value={toMonth}
          {disabled}
          aria-label="End month"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
                 font-body disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#each months as { value, label }}
            <option {value}>{label}</option>
          {/each}
        </select>
        <select
          bind:value={toYear}
          {disabled}
          aria-label="End year"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
                 font-body disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#each years as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </fieldset>
  {/if}

  <!-- Primary Checkbox -->
  <div class="flex items-center">
    <input
      id="prof-primary"
      type="checkbox"
      bind:checked={isPrimary}
      {disabled}
      class="h-4 w-4 text-forest focus:ring-forest border-gray-300 rounded disabled:opacity-50"
    />
    <label for="prof-primary" class="ml-2 block text-sm font-body text-gray-700">
      Set as primary (shown in contact cards)
    </label>
  </div>

  <!-- Notes -->
  <div>
    <label for="prof-notes" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Notes
    </label>
    <textarea
      id="prof-notes"
      bind:value={notes}
      {disabled}
      rows="2"
      placeholder="Additional details about this position..."
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed resize-none"
    ></textarea>
  </div>

  <p class="text-sm text-gray-500 font-body">
    Provide at least a job title or organization.
  </p>
</div>
