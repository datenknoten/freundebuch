<script lang="ts">
import type { Snippet } from 'svelte';
import { codeClasses } from '$lib/components/ui';
import Modal from '$lib/components/ui/modal.svelte';
import { createI18n } from '$lib/i18n/index.js';
import {
  COLLECTIVE_DETAIL_ACTIONS,
  CREATION_SHORTCUTS,
  FRIEND_DETAIL_ACTIONS,
  NAVIGATION_SHORTCUTS,
} from '../config.js';
import type { PageContext } from '../types.js';

interface Props {
  pageContext: PageContext;
  onclose: () => void;
}

let { pageContext, onclose }: Props = $props();

const i18n = createI18n();

/** The two item-picking chords every list and detail section documents. */
const pickOne = ['o', '1-9'];
const pickMany = ['o', 'a-z', '1-9'];
</script>

<!--
  Every row is "label … key [then key]"; `shortcut` is the only place that
  shape is written down, so a new chord is one line instead of five.
-->
{#snippet shortcut(label: string, keys: string[], separator?: string)}
  <div class="flex justify-between items-center">
    <span class="text-gray-700">{label}</span>
    <div class="flex gap-1 items-center">
      {#each keys as key, index (index)}
        {#if index > 0}
          <span class="text-gray-400">{separator ?? $i18n.t('shortcuts.help.then')}</span>
        {/if}
        <kbd class={codeClasses.kbd}>{key}</kbd>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet group(title: string, rows: Snippet)}
  <div>
    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
    <div class="space-y-2">{@render rows()}</div>
  </div>
{/snippet}

<Modal title={$i18n.t('shortcuts.title')} size="lg" onClose={onclose}>
  <div class="space-y-6 font-body">
    {#snippet navigationRows()}
      {#each NAVIGATION_SHORTCUTS as entry (entry.key)}
        {@render shortcut($i18n.t(entry.helpKey), ['g', entry.key])}
      {/each}
    {/snippet}
    {@render group($i18n.t('shortcuts.navigation'), navigationRows)}

    {#snippet actionRows()}
      {@render shortcut($i18n.t('shortcuts.help.globalSearch'), ['Cmd', 'K'], '+')}
      {#each CREATION_SHORTCUTS as entry (entry.key)}
        {@render shortcut($i18n.t(entry.labelKey), ['n', entry.key])}
      {/each}
      {#if pageContext.isOnFriendDetailPage}
        {@render shortcut($i18n.t('shortcuts.help.editFriend'), ['e'])}
      {/if}
      {@render shortcut($i18n.t('shortcuts.help.focusSearch'), ['/'])}
    {/snippet}
    {@render group($i18n.t('shortcuts.actions'), actionRows)}

    {#if pageContext.isOnFriendsListPage}
      {#snippet friendsListRows()}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.friend') }),
          pickOne,
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.friend') }),
          pickMany,
        )}
        {@render shortcut($i18n.t('shortcuts.help.previousPage'), ['<'])}
        {@render shortcut($i18n.t('shortcuts.help.nextPage'), ['>'])}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.friendsList'), friendsListRows)}

      {#snippet filterRows()}
        {@render shortcut($i18n.t('shortcuts.help.filterByCountry'), ['f', 'c'])}
        {@render shortcut($i18n.t('shortcuts.help.filterByCity'), ['f', 'i'])}
        {@render shortcut($i18n.t('shortcuts.help.filterByOrganization'), ['f', 'o'])}
        {@render shortcut($i18n.t('shortcuts.help.clearAllFilters'), ['f', 'x'])}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.filters'), filterRows)}
    {/if}

    {#if pageContext.isOnCollectiveDetailPage}
      {#snippet collectiveDetailRows()}
        {@render shortcut($i18n.t('shortcuts.help.editCollective'), ['e'])}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.add.member') }),
          pickOne,
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.add.member') }),
          pickMany,
        )}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.collectiveDetail'), collectiveDetailRows)}

      {#snippet collectiveAddRows()}
        {#each COLLECTIVE_DETAIL_ACTIONS as action (action.key)}
          {@render shortcut(
            $i18n.t('shortcuts.help.addItem', { item: $i18n.t(action.labelKey) }),
            ['a', action.key],
          )}
        {/each}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.addDetails'), collectiveAddRows)}
    {/if}

    {#if pageContext.isOnEncounterDetailPage}
      {#snippet encounterDetailRows()}
        {@render shortcut($i18n.t('shortcuts.help.editEncounter'), ['e'])}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.friend') }),
          pickOne,
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.friend') }),
          pickMany,
        )}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.encounterDetail'), encounterDetailRows)}
    {/if}

    {#if pageContext.isOnFriendDetailPage}
      {#snippet friendAddRows()}
        {#each FRIEND_DETAIL_ACTIONS as action (action.key)}
          {@render shortcut(
            $i18n.t('shortcuts.help.addItem', { item: $i18n.t(action.labelKey) }),
            ['a', action.key],
          )}
        {/each}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.addDetails'), friendAddRows)}

      {#snippet openLinkRows()}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.link') }),
          pickOne,
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.link') }),
          pickMany,
        )}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.openLinks'), openLinkRows)}
    {/if}

    {#if pageContext.isOnCirclesPage}
      {#snippet circleRows()}
        {@render shortcut(
          $i18n.t('shortcuts.help.editItem19', { item: $i18n.t('shortcuts.help.circle') }),
          ['e', '1-9'],
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.editItem10', { item: $i18n.t('shortcuts.help.circle') }),
          ['e', 'a-z', '1-9'],
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.deleteItem19', { item: $i18n.t('shortcuts.help.circle') }),
          ['d', '1-9'],
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.deleteItem10', { item: $i18n.t('shortcuts.help.circle') }),
          ['d', 'a-z', '1-9'],
        )}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.circlesSection'), circleRows)}
    {/if}

    {#if pageContext.isOnEncountersListPage}
      {#snippet encounterListRows()}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.encounter') }),
          pickOne,
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.encounter') }),
          pickMany,
        )}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.encountersList'), encounterListRows)}
    {/if}

    {#if pageContext.isOnCollectivesListPage}
      {#snippet collectiveListRows()}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.collective') }),
          pickOne,
        )}
        {@render shortcut(
          $i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.collective') }),
          pickMany,
        )}
      {/snippet}
      {@render group($i18n.t('shortcuts.help.collectivesList'), collectiveListRows)}
    {/if}

    {#snippet generalRows()}
      {@render shortcut($i18n.t('shortcuts.help.showHelp'), ['?'])}
      {@render shortcut($i18n.t('shortcuts.help.closeCancel'), ['Esc'])}
    {/snippet}
    {@render group($i18n.t('shortcuts.general'), generalRows)}
  </div>

  <div class="mt-6 pt-4 border-t border-gray-200">
    <p class="text-sm text-gray-500 font-body">
      {$i18n.t('shortcuts.help.helpHintPrefix')}
      <kbd class={codeClasses.kbd}>?</kbd>
      {$i18n.t('shortcuts.help.helpHintSuffix')}
    </p>
  </div>
</Modal>
