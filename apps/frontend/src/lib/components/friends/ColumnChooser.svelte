<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import { COLUMN_DEFINITIONS, type ColumnId, DEFAULT_COLUMNS, REQUIRED_COLUMNS } from '$shared';

const i18n = createI18n();

interface Props {
  columns: ColumnId[];
  onColumnsChange: (columns: ColumnId[]) => void;
}

let { columns, onColumnsChange }: Props = $props();
let isOpen = $state(false);

// All available columns (in display order)
const availableColumns: ColumnId[] = [
  'avatar',
  'displayName',
  'circles',
  'primaryEmail',
  'primaryPhone',
  'nickname',
  'organization',
  'jobTitle',
  'department',
  'primaryCity',
  'primaryCountry',
  'birthday',
  'isFavorite',
  'createdAt',
  'updatedAt',
];

function isColumnVisible(columnId: ColumnId): boolean {
  return columns.includes(columnId);
}

function isColumnRequired(columnId: ColumnId): boolean {
  return REQUIRED_COLUMNS.includes(columnId);
}

function toggleColumn(columnId: ColumnId) {
  if (isColumnRequired(columnId)) return;

  const newColumns = isColumnVisible(columnId)
    ? columns.filter((c) => c !== columnId)
    : [...columns, columnId];

  // Maintain a consistent order based on availableColumns
  const orderedColumns = availableColumns.filter((c) => newColumns.includes(c));
  onColumnsChange(orderedColumns);
}

function resetToDefaults() {
  onColumnsChange([...DEFAULT_COLUMNS]);
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.column-chooser')) {
    isOpen = false;
  }
}

$effect(() => {
  if (isOpen) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<div class="relative column-chooser">
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation();
      isOpen = !isOpen;
    }}
    class="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors border-gray-300"
    title="Choose columns"
    aria-label="Choose table columns"
    aria-expanded={isOpen}
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
    <span>{$i18n.t('common.columns')}</span>
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2"
    >
      <div class="px-3 pb-2 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {$i18n.t('common.visibleColumns')}
          </span>
          <button
            type="button"
            onclick={resetToDefaults}
            class="text-xs text-forest hover:text-forest-light transition-colors"
          >
            {$i18n.t('common.reset')}
          </button>
        </div>
      </div>

      <div class="max-h-64 overflow-y-auto py-1">
        {#each availableColumns as columnId}
          {@const definition = COLUMN_DEFINITIONS[columnId]}
          {@const isRequired = isColumnRequired(columnId)}
          {@const isVisible = isColumnVisible(columnId)}
          <label
            class="flex items-center gap-3 px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
            class:opacity-60={isRequired}
            class:cursor-not-allowed={isRequired}
          >
            <input
              type="checkbox"
              checked={isVisible}
              disabled={isRequired}
              onchange={() => toggleColumn(columnId)}
              class="rounded border-gray-300 text-forest focus:ring-forest disabled:opacity-50"
            />
            <span class="flex-1 text-sm text-gray-700">
              {definition.label || (columnId === 'avatar' ? 'Avatar' : columnId)}
            </span>
            {#if isRequired}
              <span class="text-xs text-gray-400">{$i18n.t('common.required')}</span>
            {/if}
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>
