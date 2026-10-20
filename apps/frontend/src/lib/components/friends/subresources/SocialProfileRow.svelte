<script lang="ts">
import SubresourceRow from '$lib/components/friends/subresources/SubresourceRow.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { SocialPlatform, SocialProfileResponse } from '$shared';

interface Props {
  profile: SocialProfileResponse;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Keyboard chord that opens this link (e.g. "o 3"), shown as a hint on click */
  shortcutHint?: string;
}

let { profile, onEdit, onDelete, isDeleting = false, shortcutHint }: Props = $props();

const i18n = createI18n();

function platformLabel(platform: SocialPlatform) {
  return $i18n.t(`subresources.social.platforms.${platform}`);
}

function getDisplayText() {
  if (profile.username !== undefined && profile.username !== '') {
    return `@${profile.username}`;
  }
  if (profile.profileUrl !== undefined && profile.profileUrl !== '') {
    try {
      const url = new URL(profile.profileUrl);
      const path = url.pathname.replace(/^\//, '');
      return path === '' ? url.hostname : path;
    } catch {
      return profile.profileUrl;
    }
  }
  return platformLabel(profile.platform);
}

function getLink() {
  return profile.profileUrl === undefined || profile.profileUrl === '' ? null : profile.profileUrl;
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
