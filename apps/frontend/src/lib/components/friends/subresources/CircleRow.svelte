<script lang="ts">
import CircleChip from '$lib/components/circles/CircleChip.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { CircleSummaryResponse } from '$shared';
import SubresourceRow from './SubresourceRow.svelte';

interface Props {
  circle: CircleSummaryResponse;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { circle, onDelete, isDeleting = false }: Props = $props();

const i18n = createI18n();
</script>

<SubresourceRow
  {onDelete}
  {isDeleting}
  deleteLabel={$i18n.t('subresources.circle.removeAria')}
>
  <div class="flex items-center gap-3 flex-1 min-w-0">
    <CircleChip {circle} size="md" />
  </div>
</SubresourceRow>
