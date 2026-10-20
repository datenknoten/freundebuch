<script lang="ts">
import type { ProfessionalHistoryData } from '$lib/api/friend-details.js';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormCheckbox from '$lib/components/ui/FormCheckbox.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormTextarea from '$lib/components/ui/FormTextarea.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type { ProfessionalHistoryResponse } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: ProfessionalHistoryResponse;
  defaultPrimary?: boolean;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, defaultPrimary, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let jobTitle = $state((() => initialData?.jobTitle ?? '')());
let organization = $state((() => initialData?.organization ?? '')());
let department = $state((() => initialData?.department ?? '')());
let notes = $state((() => initialData?.notes ?? '')());
let fromMonth = $state((() => initialData?.fromMonth ?? new Date().getMonth() + 1)());
let fromYear = $state((() => initialData?.fromYear ?? new Date().getFullYear())());
let toMonth = $state((() => initialData?.toMonth ?? null)() as number | null);
let toYear = $state((() => initialData?.toYear ?? null)() as number | null);
let isPrimary = $state((() => initialData?.isPrimary ?? defaultPrimary ?? false)());
let isCurrentPosition = $state(
  (() => !initialData || (initialData.toMonth === null && initialData.toYear === null))(),
);

createDirtyTracker(
  () => {
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
  },
  () => onchange,
);

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

export function getData() {
  return {
    jobTitle: jobTitle.trim() || null,
    organization: organization.trim() || null,
    department: department.trim() || null,
    notes: notes.trim() || null,
    fromMonth,
    fromYear,
    toMonth: isCurrentPosition ? null : toMonth,
    toYear: isCurrentPosition ? null : toYear,
    isPrimary,
  } satisfies ProfessionalHistoryData;
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
  <FormInput
    id="prof-job-title"
    label={$i18n.t('employment.jobTitle')}
    bind:value={jobTitle}
    {disabled}
    placeholder={$i18n.t('employment.jobTitlePlaceholder')}
    autofocus
  />

  <FormInput
    id="prof-organization"
    label={$i18n.t('employment.organization')}
    bind:value={organization}
    {disabled}
    placeholder={$i18n.t('employment.organizationPlaceholder')}
  />

  <FormInput
    id="prof-department"
    label={$i18n.t('employment.department')}
    bind:value={department}
    {disabled}
    placeholder={$i18n.t('employment.departmentPlaceholder')}
  />

  <!-- From Date -->
  <fieldset>
    <legend class={FORM_CLASSES.label}>
      {$i18n.t('employment.startDate')} <span class="text-red-500">*</span>
    </legend>
    <div class="grid grid-cols-2 gap-2">
      <select
        bind:value={fromMonth}
        {disabled}
        aria-label={$i18n.t('aria.startMonth')}
        class={FORM_CLASSES.select}
      >
        {#each months as { value, label }}
          <option {value}>{label}</option>
        {/each}
      </select>
      <select
        bind:value={fromYear}
        {disabled}
        aria-label={$i18n.t('aria.startYear')}
        class={FORM_CLASSES.select}
      >
        {#each years as year}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </div>
  </fieldset>

  <FormCheckbox
    id="prof-current"
    label={$i18n.t('employment.currentlyWorkHere')}
    bind:checked={isCurrentPosition}
    {disabled}
  />

  <!-- To Date (only shown if not current position) -->
  {#if !isCurrentPosition}
    <fieldset>
      <legend class={FORM_CLASSES.label}>
        {$i18n.t('employment.endDate')} <span class="text-red-500">*</span>
      </legend>
      <div class="grid grid-cols-2 gap-2">
        <select
          bind:value={toMonth}
          {disabled}
          aria-label={$i18n.t('aria.endMonth')}
          class={FORM_CLASSES.select}
        >
          {#each months as { value, label }}
            <option {value}>{label}</option>
          {/each}
        </select>
        <select
          bind:value={toYear}
          {disabled}
          aria-label={$i18n.t('aria.endYear')}
          class={FORM_CLASSES.select}
        >
          {#each years as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </fieldset>
  {/if}

  <FormCheckbox
    id="prof-primary"
    label={$i18n.t('subresources.employment.primaryEmployment')}
    bind:checked={isPrimary}
    {disabled}
  />

  <FormTextarea
    id="prof-notes"
    label={$i18n.t('subresources.employment.notes')}
    bind:value={notes}
    {disabled}
    rows={2}
    placeholder={$i18n.t('subresources.employment.notesPlaceholder')}
  />

  <p class="text-sm text-gray-500 font-body">
    {$i18n.t('subresources.employment.hint')}
  </p>
</div>
