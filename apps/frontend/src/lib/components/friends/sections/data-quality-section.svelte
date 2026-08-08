<script lang="ts">
import { onMount } from 'svelte';
import { getFriendDqFields, setDqNotApplicable } from '$lib/api/data-quality.js';
import { FormCheckbox } from '$lib/components/ui/index.js';
import { createI18n } from '$lib/i18n/index.js';
import { DQ_FIELD_CATALOG, type DqFieldKey, type DqFriendFieldState } from '$shared';

const i18n = createI18n();

interface Props {
  friendId: string;
}

let { friendId }: Props = $props();

let fields = $state<DqFriendFieldState[]>([]);
let pendingKey = $state<DqFieldKey | null>(null);

/**
 * Only what is actually open, plus the fields the user already dismissed so the
 * toggle can be undone. Everything filled in and applicable stays invisible.
 */
const visibleFields = $derived(
  fields.filter((field) => field.isPresent === false || field.isNotApplicable),
);

function fieldLabel(fieldKey: DqFieldKey): string {
  const definition = DQ_FIELD_CATALOG.find((entry) => entry.key === fieldKey);
  return definition === undefined ? fieldKey : $i18n.t(definition.i18nKey);
}

async function load(): Promise<void> {
  try {
    const response = await getFriendDqFields(friendId);
    fields = response.fields;
  } catch (err) {
    // A data-quality hint must never break the friend detail page.
    console.error('Failed to load data-quality fields:', err);
    fields = [];
  }
}

async function toggleNotApplicable(field: DqFriendFieldState): Promise<void> {
  const value = !field.isNotApplicable;
  pendingKey = field.fieldKey;

  try {
    await setDqNotApplicable({ friendId, fieldKey: field.fieldKey, value });
    fields = fields.map((entry) =>
      entry.fieldKey === field.fieldKey ? { ...entry, isNotApplicable: value } : entry,
    );
  } catch (err) {
    console.error('Failed to update data-quality field:', err);
  } finally {
    pendingKey = null;
  }
}

onMount(load);
</script>

{#if visibleFields.length > 0}
  <section class="space-y-2">
    <div class="flex items-center bg-forest/10 text-forest px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading">{$i18n.t('dataQuality.friendSection.title')}</h2>
    </div>
    <ul class="space-y-1">
      {#each visibleFields as field (field.fieldKey)}
        <li class="flex items-center justify-between gap-4 px-3 py-1.5">
          <span class="text-sm font-body text-gray-500">
            {field.isNotApplicable
              ? fieldLabel(field.fieldKey)
              : $i18n.t('dataQuality.state.missing', { field: fieldLabel(field.fieldKey) })}
          </span>
          <FormCheckbox
            id="dq-na-{field.fieldKey}"
            label={$i18n.t('dataQuality.friendSection.notApplicableHint')}
            checked={field.isNotApplicable}
            disabled={pendingKey === field.fieldKey}
            onchange={() => toggleNotApplicable(field)}
          />
        </li>
      {/each}
    </ul>
  </section>
{/if}
