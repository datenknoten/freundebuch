<script lang="ts">
import type { Url, UrlType } from '$shared';
import SubresourceRow from './SubresourceRow.svelte';

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

<SubresourceRow {onEdit} {onDelete} {isDeleting} editLabel="Edit URL" deleteLabel="Delete URL">
  <div class="flex-1 min-w-0">
    <a
      href={url.url}
      target="_blank"
      rel="noopener noreferrer"
      class="text-forest font-body font-semibold hover:text-forest-light truncate block"
    >
      {formatUrl(url.url)}
    </a>
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {formatUrlType(url.urlType)}
      {#if url.label} - {url.label}{/if}
    </span>
  </div>
</SubresourceRow>
