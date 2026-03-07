<script lang="ts">
import { createDirtyTracker, FormCheckbox, FormInput, FormSelect } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { Email, EmailInput, EmailType } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: Email;
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

export function getData(): EmailInput {
  return {
    email_address: emailAddress.trim(),
    email_type: emailType,
    label: label.trim() || undefined,
    is_primary: isPrimary,
  };
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
    placeholder="name@example.com"
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
    placeholder="e.g., Main, Newsletter"
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
