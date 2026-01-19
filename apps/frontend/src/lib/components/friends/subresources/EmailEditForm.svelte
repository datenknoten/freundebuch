<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import { createI18n } from '$lib/i18n/index.js';
import type { Email, EmailInput, EmailType } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: Email;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let emailAddress = $state((() => initialData?.emailAddress ?? '')());
let emailType = $state<EmailType>((() => initialData?.emailType ?? 'personal')());
let label = $state((() => initialData?.label ?? '')());
let isPrimary = $state((() => initialData?.isPrimary ?? false)());

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  emailAddress;
  emailType;
  label;
  isPrimary;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

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
  <!-- Email Address -->
  <div>
    <label for="email-address" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.email.emailAddress')} <span class="text-red-500">*</span>
    </label>
    <input
      use:autoFocus
      id="email-address"
      type="email"
      bind:value={emailAddress}
      {disabled}
      placeholder="name@example.com"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
      required
    />
  </div>

  <!-- Email Type -->
  <div>
    <label for="email-type" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.common.type')}
    </label>
    <select
      id="email-type"
      bind:value={emailType}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="personal">{$i18n.t('subresources.email.types.personal')}</option>
      <option value="work">{$i18n.t('subresources.email.types.work')}</option>
      <option value="other">{$i18n.t('subresources.email.types.other')}</option>
    </select>
  </div>

  <!-- Label (optional) -->
  <div>
    <label for="email-label" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.common.label')} <span class="text-gray-400">({$i18n.t('common.optional')})</span>
    </label>
    <input
      id="email-label"
      type="text"
      bind:value={label}
      {disabled}
      placeholder="e.g., Main, Newsletter"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Primary checkbox -->
  <div class="flex items-center gap-2">
    <input
      id="email-primary"
      type="checkbox"
      bind:checked={isPrimary}
      {disabled}
      class="w-4 h-4 text-forest border-gray-300 rounded focus:ring-forest
             disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <label for="email-primary" class="text-sm font-body text-gray-700">
      {$i18n.t('subresources.email.primaryEmail')}
    </label>
  </div>
</div>
