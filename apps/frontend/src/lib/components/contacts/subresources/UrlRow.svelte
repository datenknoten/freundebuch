<script lang="ts">
import type { Url, UrlType } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  url: Url;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { url, onEdit, onDelete, isDeleting = false }: Props = $props();

function formatUrlType(type: UrlType): string {
  const typeLabels: Record<UrlType, string> = {
    personal: 'Personal',
    work: 'Work',
    blog: 'Blog',
    other: 'Other',
  };
  return typeLabels[type] || type;
}

function formatUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    return rawUrl;
  }
}
</script>

<!-- Mobile: Swipeable row -->
<div class="sm:hidden">
  <SwipeableRow onSwipeRight={onEdit} onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex-1 min-w-0">
        <a
          href={url.url}
          target="_blank"
          rel="noopener noreferrer"
          class="text-forest font-body font-semibold hover:text-forest-light truncate block"
        >
          {formatUrl(url.url)}
        </a>
        <div class="text-sm text-gray-500">
          {formatUrlType(url.urlType)}
          {#if url.label} - {url.label}{/if}
        </div>
      </div>
      <DetailActions
        {onEdit}
        {onDelete}
        {isDeleting}
        editLabel="Edit URL"
        deleteLabel="Delete URL"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      <a
        href={url.url}
        target="_blank"
        rel="noopener noreferrer"
        class="text-forest font-body font-semibold hover:text-forest-light"
      >
        {formatUrl(url.url)}
      </a>
      <span class="text-sm text-gray-500 ml-2">
        {formatUrlType(url.urlType)}
        {#if url.label} - {url.label}{/if}
      </span>
    </div>
    <DetailActions
      {onEdit}
      {onDelete}
      {isDeleting}
      editLabel="Edit URL"
      deleteLabel="Delete URL"
    />
  </div>
</div>
