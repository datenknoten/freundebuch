<script lang="ts">
import { chipClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { ContactCollectiveSummary } from '$shared';
import SubresourceRow from './subresource-row.svelte';

const i18n = createI18n();

interface Props {
  collective: ContactCollectiveSummary;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Keyboard chord that opens this link (e.g. "o 3"), shown as a hint on click */
  shortcutHint?: string;
}

let { collective, onDelete, isDeleting = false, shortcutHint }: Props = $props();
</script>

<SubresourceRow
  {onDelete}
  {isDeleting}
  deleteLabel={$i18n.t('subresources.collective.removeAria')}
>
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <a
        href="/collectives/{collective.id}"
        class="font-body font-semibold text-forest hover:underline"
        data-shortcut={shortcutHint}
        data-shortcut-label={shortcutHint !== undefined ? 'shortcuts.panels.openLink' : undefined}
      >
        {collective.name}
      </a>
      {#if !collective.isActive}
        <span class="{chipClasses.base} {chipClasses.neutral}">
          {$i18n.t('collectives.inactive')}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-500 font-body mt-1">
      <span>{collective.typeName}</span>
      <span class="text-gray-300">|</span>
      <span>{collective.role.label}</span>
    </div>
  </div>
</SubresourceRow>
