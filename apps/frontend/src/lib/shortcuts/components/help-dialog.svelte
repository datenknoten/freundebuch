<script lang="ts">
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
</script>

<Modal title={$i18n.t('shortcuts.title')} size="lg" onClose={onclose}>
  <div class="space-y-6 font-body">
    <!-- Navigation -->
    <div>
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {$i18n.t('shortcuts.navigation')}
      </h3>
      <div class="space-y-2">
        {#each NAVIGATION_SHORTCUTS as shortcut}
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t(shortcut.helpKey)}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">{shortcut.key}</kbd>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Global Actions -->
    <div>
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {$i18n.t('shortcuts.actions')}
      </h3>
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-gray-700">{$i18n.t('shortcuts.help.globalSearch')}</span>
          <div class="flex gap-1">
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">Cmd</kbd>
            <span class="text-gray-400">+</span>
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">K</kbd>
          </div>
        </div>
        {#each CREATION_SHORTCUTS as shortcut}
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t(shortcut.labelKey)}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">{shortcut.key}</kbd>
            </div>
          </div>
        {/each}
        {#if pageContext.isOnFriendDetailPage}
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.editFriend')}</span>
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
          </div>
        {/if}
        <div class="flex justify-between items-center">
          <span class="text-gray-700">{$i18n.t('shortcuts.help.focusSearch')}</span>
          <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">/</kbd>
        </div>
      </div>
    </div>

    <!-- Friends List Actions (only on /friends) -->
    {#if pageContext.isOnFriendsListPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.friendsList')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.friend') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.friend') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.previousPage')}</span>
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">&lt;</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.nextPage')}</span>
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">&gt;</kbd>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.filters')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.filterByCountry')}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.filterByCity')}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">i</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.filterByOrganization')}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.clearAllFilters')}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">x</kbd>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Collective Detail -->
    {#if pageContext.isOnCollectiveDetailPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.collectiveDetail')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.editCollective')}</span>
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.add.member') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.add.member') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.addDetails')}
        </h3>
        <div class="space-y-2">
          {#each COLLECTIVE_DETAIL_ACTIONS as action}
            <div class="flex justify-between items-center">
              <span class="text-gray-700">{$i18n.t('shortcuts.help.addItem', { item: $i18n.t(action.labelKey) })}</span>
              <div class="flex gap-1">
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">{action.key}</kbd>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Encounter Detail -->
    {#if pageContext.isOnEncounterDetailPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.encounterDetail')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.editEncounter')}</span>
            <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.friend') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.friend') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Friend Detail: Add Details + Open Links -->
    {#if pageContext.isOnFriendDetailPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.addDetails')}
        </h3>
        <div class="space-y-2">
          {#each FRIEND_DETAIL_ACTIONS as action}
            <div class="flex justify-between items-center">
              <span class="text-gray-700">{$i18n.t('shortcuts.help.addItem', { item: $i18n.t(action.labelKey) })}</span>
              <div class="flex gap-1">
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">{action.key}</kbd>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.openLinks')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.link') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.link') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Circles -->
    {#if pageContext.isOnCirclesPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.circlesSection')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.editItem19', { item: $i18n.t('shortcuts.help.circle') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.editItem10', { item: $i18n.t('shortcuts.help.circle') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.deleteItem19', { item: $i18n.t('shortcuts.help.circle') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">d</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.deleteItem10', { item: $i18n.t('shortcuts.help.circle') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">d</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Encounters List -->
    {#if pageContext.isOnEncountersListPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.encountersList')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.encounter') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.encounter') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Collectives List -->
    {#if pageContext.isOnCollectivesListPage}
      <div>
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {$i18n.t('shortcuts.help.collectivesList')}
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem19', { item: $i18n.t('shortcuts.help.collective') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">{$i18n.t('shortcuts.help.openItem10', { item: $i18n.t('shortcuts.help.collective') })}</span>
            <div class="flex gap-1">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
              <span class="text-gray-400">{$i18n.t('shortcuts.help.then')}</span>
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- General -->
    <div>
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {$i18n.t('shortcuts.general')}
      </h3>
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-gray-700">{$i18n.t('shortcuts.help.showHelp')}</span>
          <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">?</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">{$i18n.t('shortcuts.help.closeCancel')}</span>
          <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">Esc</kbd>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-6 pt-4 border-t border-gray-200">
    <p class="text-sm text-gray-500 font-body">
      {$i18n.t('shortcuts.help.helpHintPrefix')} <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> {$i18n.t('shortcuts.help.helpHintSuffix')}
    </p>
  </div>
</Modal>
