<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
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

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  platform;
  profileUrl;
  username;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

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

// Platform keys for i18n lookup
const platforms: SocialPlatform[] = [
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'github',
  'other',
];
</script>

<div class="space-y-4">
  <!-- Platform -->
  <div>
    <label for="social-platform" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.social.platform')} <span class="text-red-500">*</span>
    </label>
    <select
      use:autoFocus
      id="social-platform"
      bind:value={platform}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#each platforms as p}
        <option value={p}>{$i18n.t(`subresources.social.platforms.${p}`)}</option>
      {/each}
    </select>
  </div>

  <!-- Username -->
  <div>
    <label for="social-username" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.social.username')}
    </label>
    <input
      id="social-username"
      type="text"
      bind:value={username}
      {disabled}
      placeholder="@username"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <!-- Profile URL -->
  <div>
    <label for="social-url" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('subresources.social.profileUrl')}
    </label>
    <input
      id="social-url"
      type="url"
      bind:value={profileUrl}
      {disabled}
      placeholder="https://linkedin.com/in/username"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

  <p class="text-sm text-gray-500 font-body">
    {$i18n.t('subresources.social.hint')}
  </p>
</div>
