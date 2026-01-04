<script lang="ts">
import type { SocialPlatform, SocialProfile } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  profile: SocialProfile;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { profile, onEdit, onDelete, isDeleting = false }: Props = $props();

const platformLabels: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  github: 'GitHub',
  other: 'Other',
};

function formatPlatform(platform: SocialPlatform): string {
  return platformLabels[platform] || platform;
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
  return formatPlatform(profile.platform);
}

function getLink(): string | null {
  return profile.profileUrl || null;
}
</script>

<!-- Mobile: Swipeable row -->
<div class="sm:hidden">
  <SwipeableRow onSwipeRight={onEdit} onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex-1 min-w-0">
        {#if getLink()}
          <a
            href={getLink()}
            target="_blank"
            rel="noopener noreferrer"
            class="text-forest font-body font-semibold hover:text-forest-light truncate block"
          >
            {getDisplayText()}
          </a>
        {:else}
          <span class="text-gray-900 font-body font-semibold truncate block">
            {getDisplayText()}
          </span>
        {/if}
        <div class="text-sm text-gray-500">
          {formatPlatform(profile.platform)}
        </div>
      </div>
      <DetailActions
        {onEdit}
        {onDelete}
        {isDeleting}
        editLabel="Edit social profile"
        deleteLabel="Delete social profile"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      {#if getLink()}
        <a
          href={getLink()}
          target="_blank"
          rel="noopener noreferrer"
          class="text-forest font-body font-semibold hover:text-forest-light"
        >
          {getDisplayText()}
        </a>
      {:else}
        <span class="text-gray-900 font-body font-semibold">
          {getDisplayText()}
        </span>
      {/if}
      <span class="text-sm text-gray-500 ml-2">
        {formatPlatform(profile.platform)}
      </span>
    </div>
    <DetailActions
      {onEdit}
      {onDelete}
      {isDeleting}
      editLabel="Edit social profile"
      deleteLabel="Delete social profile"
    />
  </div>
</div>
