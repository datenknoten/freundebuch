<script lang="ts">
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { surfaceClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import {
  getKeyboardHint,
  isOpenEncounterModeActive,
  openEncounterModePrefix,
} from '$lib/stores/ui';
import type { EncounterListItem } from '$shared';
import FriendAvatar from '../friends/friend-avatar.svelte';
import KeyboardHintBadge from '../keyboard-hint-badge.svelte';
import { encounterDisplayTitle, encounterTypeLabel } from './encounter-display';
import EncounterTypeIcon from './encounter-type-icon.svelte';

const i18n = createI18n();

interface Props {
  encounter: EncounterListItem;
  href?: string;
  /** Index in the list (for keyboard hints) */
  index?: number;
}

let { encounter, href = `/encounters/${encounter.id}`, index }: Props = $props();

let displayTitle = $derived(encounterDisplayTitle($i18n.t, encounter));

// The badge decides for itself whether it is visible; the card only needs the
// hint text to build its shortcut attributes.
let keyHint = $derived(index === undefined ? '' : getKeyboardHint(index));
let openShortcut = $derived(keyHint.length > 0 ? `o ${keyHint}` : undefined);

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<a
  {href}
  class="block {surfaceClasses.cardInteractive} relative"
  data-shortcut={openShortcut}
  data-shortcut-label={openShortcut === undefined ? undefined : 'shortcuts.panels.openEncounter'}
>
  {#if index !== undefined}
    <KeyboardHintBadge
      {index}
      isActive={$isOpenEncounterModeActive}
      prefix={$openEncounterModePrefix}
      variant="card"
    />
  {/if}
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1 min-w-0">
      <h3 class="font-heading font-semibold text-gray-900 truncate flex items-center gap-2">
        <span
          class="flex-shrink-0 text-forest"
          title={encounterTypeLabel($i18n.t, encounter.encounterType)}
        >
          <EncounterTypeIcon type={encounter.encounterType} class="w-4 h-4" />
        </span>
        <span class="truncate">{displayTitle}</span>
      </h3>

      <div class="mt-1 flex items-center gap-2 text-sm text-gray-500 font-body">
        <Calendar class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
        <span>{formatDate(encounter.encounterDate)}</span>
      </div>

      {#if encounter.locationText}
        <div class="mt-1 flex items-center gap-2 text-sm text-gray-500 font-body">
          <MapPin class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
          <span class="truncate">{encounter.locationText}</span>
        </div>
      {/if}
    </div>

    <!-- Friend count badge -->
    <div class="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500 font-body">
      <Users class="w-4 h-4" strokeWidth="2" />
      <span>{encounter.friendCount}</span>
    </div>
  </div>

  <!-- Friend avatars preview -->
  {#if encounter.friends.length > 0}
    <div class="mt-3 flex items-center gap-1">
      <div class="flex -space-x-2">
        {#each encounter.friends.slice(0, 3) as friend (friend.id)}
          <div class="ring-2 ring-white rounded-full">
            <FriendAvatar
              displayName={friend.displayName}
              photoUrl={friend.photoUrl}
              size="sm"
            />
          </div>
        {/each}
      </div>
      {#if encounter.friendCount > 3}
        <span class="ml-2 text-xs text-gray-500 font-body">
          {$i18n.t('encounters.friendCountMore', { count: encounter.friendCount - 3 })}
        </span>
      {/if}
    </div>
  {/if}
</a>
