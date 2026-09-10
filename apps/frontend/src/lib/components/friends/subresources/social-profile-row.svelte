<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { SocialPlatform, SocialProfile } from '$shared';
import SubresourceRow from './subresource-row.svelte';

interface Props {
  profile: SocialProfile;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Keyboard chord that opens this link (e.g. "o 3"), shown as a hint on click */
  shortcutHint?: string;
}

let { profile, onEdit, onDelete, isDeleting = false, shortcutHint }: Props = $props();

const i18n = createI18n();

function platformLabel(platform: SocialPlatform): string {
  return $i18n.t(`subresources.social.platforms.${platform}`);
}

function getDisplayText(): string {
  if (profile.username) {
    return `@${profile.username}`;
  }
  if (profile.profileUrl) {
    try {
      const url = new URL(profile.profileUrl);
      return url.pathname.replace(/^\//, '') || url.hostname;
    } catch {
      return profile.profileUrl;
    }
  }
  return platformLabel(profile.platform);
}

function getLink(): string | null {
  return profile.profileUrl || null;
}
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.social.editAria')}
  deleteLabel={$i18n.t('subresources.social.deleteAria')}
>
  <div class="flex-1 min-w-0">
    {#if getLink()}
      <a
        href={getLink()}
        target="_blank"
        rel="noopener noreferrer"
        class="text-forest font-body font-semibold hover:text-forest-light truncate block"
        data-shortcut={shortcutHint}
        data-shortcut-label={shortcutHint ? 'shortcuts.panels.openLink' : undefined}
      >
        {getDisplayText()}
      </a>
    {:else}
      <span class="text-gray-900 font-body font-semibold truncate block">
        {getDisplayText()}
      </span>
    {/if}
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {platformLabel(profile.platform)}
    </span>
  </div>
</SubresourceRow>
