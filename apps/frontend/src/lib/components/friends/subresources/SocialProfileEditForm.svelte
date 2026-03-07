<script lang="ts">
import { createDirtyTracker, FormInput, FormSelect } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { SocialPlatform, SocialProfile, SocialProfileInput } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: SocialProfile;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let platform = $state<SocialPlatform>((() => initialData?.platform ?? 'linkedin')());
let profileUrl = $state((() => initialData?.profileUrl ?? '')());
let username = $state((() => initialData?.username ?? '')());

createDirtyTracker(
  () => {
    platform;
    profileUrl;
    username;
  },
  () => onchange,
);

// Platform keys for i18n lookup
const platformKeys: SocialPlatform[] = [
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'github',
  'other',
];

const platformOptions = $derived(
  platformKeys.map((p) => ({ value: p, label: $i18n.t(`subresources.social.platforms.${p}`) })),
);

export function getData(): SocialProfileInput {
  return {
    platform,
    profile_url: profileUrl.trim() || null,
    username: username.trim() || null,
  };
}

export function isValid(): boolean {
  // At least one of profile_url or username must be provided
  return profileUrl.trim().length > 0 || username.trim().length > 0;
}
</script>

<div class="space-y-4">
  <FormSelect
    id="social-platform"
    label={$i18n.t('subresources.social.platform')}
    bind:value={platform}
    options={platformOptions}
    {disabled}
    required
    autofocus
  />

  <FormInput
    id="social-username"
    label={$i18n.t('subresources.social.username')}
    bind:value={username}
    {disabled}
    placeholder="@username"
  />

  <FormInput
    id="social-url"
    label={$i18n.t('subresources.social.profileUrl')}
    bind:value={profileUrl}
    type="url"
    {disabled}
    placeholder="https://linkedin.com/in/username"
  />

  <p class="text-sm text-gray-500 font-body">
    {$i18n.t('subresources.social.hint')}
  </p>
</div>
