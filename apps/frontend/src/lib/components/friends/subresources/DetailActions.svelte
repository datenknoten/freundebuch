<script lang="ts">
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
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
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
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    {/if}
  </button>
</div>
