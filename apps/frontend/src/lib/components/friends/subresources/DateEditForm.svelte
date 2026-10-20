<script lang="ts">
import type { DateData } from '$lib/api/friend-details.js';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormCheckbox from '$lib/components/ui/FormCheckbox.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { DateType, FriendDateResponse } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: FriendDateResponse;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let dateValue = $state((() => initialData?.dateValue ?? '')());
let yearKnown = $state((() => initialData?.yearKnown ?? true)());
let dateType = $state<DateType>((() => initialData?.dateType ?? 'birthday')());
let label = $state((() => initialData?.label ?? '')());

function trackDirtyFields() {
  dateValue;
  yearKnown;
  dateType;
  label;
}

createDirtyTracker(trackDirtyFields, () => onchange);

const dateTypeOptions = $derived([
  { value: 'birthday' as const, label: $i18n.t('subresources.date.types.birthday') },
  { value: 'anniversary' as const, label: $i18n.t('subresources.date.types.anniversary') },
  { value: 'other' as const, label: $i18n.t('subresources.date.types.other') },
]);

export function getData() {
  const trimmedLabel = label.trim();
  return {
    dateValue,
    yearKnown,
    dateType,
    label: trimmedLabel === '' ? undefined : trimmedLabel,
  } satisfies DateData;
}

export function isValid() {
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
    placeholder={$i18n.t('subresources.date.placeholder.label')}
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
