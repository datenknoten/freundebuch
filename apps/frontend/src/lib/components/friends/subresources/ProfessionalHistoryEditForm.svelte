<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import type { ProfessionalHistory, ProfessionalHistoryInput } from '$shared';

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

// Month names
const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Generate year options (current year back to 50 years ago, and 5 years ahead)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 60 }, (_, i) => currentYear + 5 - i);
</script>

<div class="space-y-4">
  <!-- Job Title -->
  <div>
    <label for="prof-job-title" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Job Title
    </label>
    <input
      use:autoFocus
      id="prof-job-title"
      type="text"
      bind:value={jobTitle}
      {disabled}
      placeholder="Software Engineer"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Organization -->
  <div>
    <label for="prof-organization" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Organization
    </label>
    <input
      id="prof-organization"
      type="text"
      bind:value={organization}
      {disabled}
      placeholder="Acme Corp"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Department -->
  <div>
    <label for="prof-department" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Department
    </label>
    <input
      id="prof-department"
      type="text"
      bind:value={department}
      {disabled}
      placeholder="Engineering"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- From Date -->
  <div>
    <label class="block text-sm font-body font-medium text-gray-700 mb-1">
      Start Date <span class="text-red-500">*</span>
    </label>
    <div class="grid grid-cols-2 gap-2">
      <select
        bind:value={fromMonth}
        {disabled}
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
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
               font-body disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#each years as year}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </div>
  </div>

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
      I currently work here
    </label>
  </div>

  <!-- To Date (only shown if not current position) -->
  {#if !isCurrentPosition}
    <div>
      <label class="block text-sm font-body font-medium text-gray-700 mb-1">
        End Date <span class="text-red-500">*</span>
      </label>
      <div class="grid grid-cols-2 gap-2">
        <select
          bind:value={toMonth}
          {disabled}
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
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
                 font-body disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#each years as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </div>
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
