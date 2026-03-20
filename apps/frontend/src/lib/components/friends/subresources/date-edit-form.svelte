<script lang="ts">
import { createDirtyTracker, FormCheckbox, FormInput, FormSelect } from '$lib/components/ui';
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

createDirtyTracker(
  () => {
    dateValue;
    yearKnown;
    dateType;
    label;
  },
  () => onchange,
);

const dateTypeOptions = $derived([
  { value: 'birthday' as const, label: $i18n.t('subresources.date.types.birthday') },
  { value: 'anniversary' as const, label: $i18n.t('subresources.date.types.anniversary') },
  { value: 'other' as const, label: $i18n.t('subresources.date.types.other') },
]);

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
  <FormInput
    id="date-value"
    label={$i18n.t('subresources.date.date')}
    bind:value={dateValue}
    type="date"
    {disabled}
    required
    autofocus
  />

  <FormSelect
    id="date-type"
    label={$i18n.t('subresources.common.type')}
    bind:value={dateType}
    options={dateTypeOptions}
    {disabled}
  />

  <FormInput
    id="date-label"
    label={$i18n.t('subresources.common.label')}
    bind:value={label}
    {disabled}
    placeholder="e.g., Wedding anniversary, First met"
    optional
    optionalText={$i18n.t('common.optional')}
  />

  <FormCheckbox
    id="date-year-known"
    label={$i18n.t('subresources.date.yearKnown')}
    bind:checked={yearKnown}
    {disabled}
  />
</div>
