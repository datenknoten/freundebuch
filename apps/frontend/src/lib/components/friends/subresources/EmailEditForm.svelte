<script lang="ts">
import type { EmailData } from '$lib/api/email-data.js';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormCheckbox from '$lib/components/ui/FormCheckbox.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { EmailResponse, EmailType } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: EmailResponse;
  defaultPrimary?: boolean;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, defaultPrimary, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let emailAddress = $state((() => initialData?.emailAddress ?? '')());
let emailType = $state<EmailType>((() => initialData?.emailType ?? 'personal')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? defaultPrimary ?? false)());

createDirtyTracker(
  () => {
    emailAddress;
    emailType;
    label;
    isPrimary;
  },
  () => onchange,
);

const emailTypeOptions = $derived([
  { value: 'personal' as const, label: $i18n.t('subresources.email.types.personal') },
  { value: 'work' as const, label: $i18n.t('subresources.email.types.work') },
  { value: 'other' as const, label: $i18n.t('subresources.email.types.other') },
]);

export function getData() {
  return {
    emailAddress: emailAddress.trim(),
    emailType,
    label: label.trim() || undefined,
    isPrimary,
  } satisfies EmailData;
}

export function isValid(): boolean {
  const email = emailAddress.trim();
  return email.length > 0 && email.includes('@');
}
</script>

<div class="space-y-4">
  <FormInput
    id="email-address"
    label={$i18n.t('subresources.email.emailAddress')}
    bind:value={emailAddress}
    type="email"
    {disabled}
    placeholder={$i18n.t('subresources.email.placeholder.address')}
    required
    autofocus
  />

  <FormSelect
    id="email-type"
    label={$i18n.t('subresources.common.type')}
    bind:value={emailType}
    options={emailTypeOptions}
    {disabled}
  />

  <FormInput
    id="email-label"
    label={$i18n.t('subresources.common.label')}
    bind:value={label}
    {disabled}
    placeholder={$i18n.t('subresources.email.placeholder.label')}
    optional
    optionalText={$i18n.t('common.optional')}
  />

  <FormCheckbox
    id="email-primary"
    label={$i18n.t('subresources.email.primaryEmail')}
    bind:checked={isPrimary}
    {disabled}
  />
</div>
