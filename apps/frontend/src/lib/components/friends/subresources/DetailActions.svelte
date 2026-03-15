<script lang="ts">
import PencilSquare from 'svelte-heros-v2/PencilSquare.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';

interface Props {
  onEdit?: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  editLabel?: string;
  deleteLabel?: string;
}

let {
  onEdit,
  onDelete,
  isDeleting = false,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: Props = $props();
</script>

<!--
  Desktop: hidden until parent has group-hover (opacity-0 -> opacity-100)
  Mobile (sm:): always visible but muted (opacity-50), brightens on hover
-->
<div
  class="flex gap-1 items-center
         opacity-0 group-hover:opacity-100
         sm:opacity-50 sm:hover:opacity-100
         transition-opacity duration-150"
>
  {#if onEdit}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-forest
             transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center
             sm:min-w-[44px] sm:min-h-[44px]"
      aria-label={editLabel}
    >
      <PencilSquare class="w-4 h-4" strokeWidth="2" />
    </button>
  {/if}
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation();
      onDelete();
    }}
    disabled={isDeleting}
    class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600
           transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center
           sm:min-w-[44px] sm:min-h-[44px]
           disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label={deleteLabel}
  >
    {#if isDeleting}
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    {:else}
      <XMark class="w-4 h-4" strokeWidth="2" />
    {/if}
  </button>
</div>
