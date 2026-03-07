<script lang="ts">
import { createDirtyTracker, FormCheckbox, FormInput, FormSelect } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { Phone, PhoneInput, PhoneType } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: Phone;
  defaultPrimary?: boolean;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, defaultPrimary, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let phoneNumber = $state((() => initialData?.phoneNumber ?? '')());
let phoneType = $state<PhoneType>((() => initialData?.phoneType ?? 'mobile')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? defaultPrimary ?? false)());

createDirtyTracker(
  () => {
    phoneNumber;
    phoneType;
    label;
    isPrimary;
  },
  () => onchange,
);

const phoneTypeOptions = $derived([
  { value: 'mobile' as const, label: $i18n.t('subresources.phone.types.mobile') },
  { value: 'home' as const, label: $i18n.t('subresources.phone.types.home') },
  { value: 'work' as const, label: $i18n.t('subresources.phone.types.work') },
  { value: 'fax' as const, label: $i18n.t('subresources.phone.types.fax') },
  { value: 'other' as const, label: $i18n.t('subresources.phone.types.other') },
]);

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
  <FormInput
    id="phone-number"
    label={$i18n.t('subresources.phone.phoneNumber')}
    bind:value={phoneNumber}
    type="tel"
    {disabled}
    placeholder="+1 555-123-4567"
    required
    autofocus
  />

  <FormSelect
    id="phone-type"
    label={$i18n.t('subresources.common.type')}
    bind:value={phoneType}
    options={phoneTypeOptions}
    {disabled}
  />

  <FormInput
    id="phone-label"
    label={$i18n.t('subresources.common.label')}
    bind:value={label}
    {disabled}
    placeholder="e.g., Personal cell, Work direct"
    optional
    optionalText={$i18n.t('common.optional')}
  />

  <FormCheckbox
    id="phone-primary"
    label={$i18n.t('subresources.phone.primaryPhone')}
    bind:checked={isPrimary}
    {disabled}
  />
</div>
