<script lang="ts">
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import { getAppContext } from '$lib/app-context.js';
import EncounterTypeIcon from '$lib/components/encounters/EncounterTypeIcon.svelte';
import FriendAvatar from '$lib/components/friends/FriendAvatar.svelte';
import KeyboardHintBadge from '$lib/components/KeyboardHintBadge.svelte';
import Button from '$lib/components/ui/Button.svelte';
import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
import { HEADING_CLASSES } from '$lib/components/ui/heading-classes.js';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import MarkdownView from '$lib/editor/MarkdownView.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import { getKeyboardHint } from '$lib/utils/keyboard-hint.js';
import type { EncounterResponse } from '$shared';
import { encounterDisplayTitle, encounterTypeLabel } from './encounter-display.js';

const keyboardModes = getAppContext().stores.keyboardModes;
const isOpenEncounterFriendModeActive = keyboardModes.encounterFriends.isActive;
const openEncounterFriendModePrefix = keyboardModes.encounterFriends.prefix;
const visibleEncounterFriendIds = keyboardModes.encounterFriends.visibleItems;

const i18n = createI18n();
const encounters = getAppContext().stores.encounters;

interface Props {
  encounter: EncounterResponse;
  onEdit?: () => void;
}

let { encounter, onEdit }: Props = $props();

// ConfirmDialog owns the in-flight and error state
let showDeleteConfirm = $state(false);

let displayTitle = $derived(encounterDisplayTitle($i18n.t, encounter));

function syncVisibleEncounterFriendIds() {
  visibleEncounterFriendIds.set(encounter.friends.map((f) => f.id));
}

// Track visible friend IDs for keyboard open mode (o)
$effect(syncVisibleEncounterFriendIds);

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(isoStr: string) {
  const date = new Date(isoStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Rejections propagate to ConfirmDialog, which keeps itself open and shows the
// reason; on success it closes itself and we navigate away.
async function handleDelete() {
  await encounters.deleteEncounter(encounter.id);
  void goto('/encounters');
}
</script>

<div class="space-y-6">
  <!-- Header with icon avatar and actions -->
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <!-- Type icon as avatar -->
    <div class="flex-shrink-0 w-20 h-20 rounded-full bg-forest/10 text-forest flex items-center justify-center">
      <EncounterTypeIcon type={encounter.encounterType} class="w-10 h-10" />
    </div>

    <div class="flex-1 text-center sm:text-left">
      <h1 class={HEADING_CLASSES.entity}>{displayTitle}</h1>
      <div class="mt-1 flex items-center gap-2 text-gray-600 font-body justify-center sm:justify-start">
        <EncounterTypeIcon type={encounter.encounterType} class="w-4 h-4 flex-shrink-0" />
        <span>{encounterTypeLabel($i18n.t, encounter.encounterType)}</span>
      </div>
      <div class="mt-1 flex items-center gap-2 text-gray-600 font-body justify-center sm:justify-start">
        <Calendar class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
        <span>{formatDate(encounter.encounterDate)}</span>
      </div>
      {#if encounter.locationText}
        <div class="mt-1 flex items-center gap-2 text-gray-600 font-body text-sm justify-center sm:justify-start">
          <MapPin class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
          <span>{encounter.locationText}</span>
        </div>
      {/if}
    </div>

    <div class="flex gap-2">
      <Button
        variant="secondary"
        onclick={() => onEdit?.()}
        data-shortcut="e"
        data-shortcut-label="shortcuts.help.editEncounter"
      >
        {$i18n.t('common.edit')}
      </Button>
      <Button variant="dangerOutline" onclick={() => showDeleteConfirm = true}>
        {$i18n.t('common.delete')}
      </Button>
    </div>
  </div>

  <!-- ==================== FRIENDS SECTION ==================== -->
  <section class="space-y-2">
    <h2 class="{SURFACE_CLASSES.sectionHeading} {HEADING_CLASSES.section}">
      <Users class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('encounters.detail.friends')}
      <span class="text-sm font-body font-normal text-forest/70">({encounter.friends.length})</span>
    </h2>
    <div class="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
      {#each encounter.friends as friend, index (friend.id)}
        <div class="relative">
          <KeyboardHintBadge {index} isActive={$isOpenEncounterFriendModeActive} prefix={$openEncounterFriendModePrefix} variant="card" />
          <a
            href="/friends/{friend.id}"
            class="inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-forest transition-colors"
            data-shortcut="o {getKeyboardHint(index)}"
            data-shortcut-label="shortcuts.panels.openFriend"
          >
            <FriendAvatar
              displayName={friend.displayName}
              photoUrl={friend.photoUrl}
              size="sm"
            />
            <span class="font-body text-sm text-gray-900">{friend.displayName}</span>
          </a>
        </div>
      {/each}
    </div>
  </section>

  <!-- ==================== NOTES SECTION ==================== -->
  {#if encounter.description}
    <section class="space-y-2">
      <h2 class="{SURFACE_CLASSES.sectionHeading} {HEADING_CLASSES.section}">
        <DocumentText class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('encounters.detail.notes')}
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg">
        <MarkdownView source={encounter.description} />
      </div>
    </section>
  {/if}

  <!-- ==================== METADATA FOOTER ==================== -->
  <section class="text-sm text-gray-500 font-body">
    <div class="flex flex-wrap gap-4">
      <span>{$i18n.t('encounters.detail.created')} {formatTimestamp(encounter.createdAt)}</span>
      <span>{$i18n.t('encounters.detail.lastUpdated')} {formatTimestamp(encounter.updatedAt)}</span>
    </div>
  </section>
</div>

<!-- Delete encounter confirmation -->
{#if showDeleteConfirm}
  <ConfirmDialog
    title={$i18n.t('encounters.detail.deleteConfirmTitle')}
    description={$i18n.t('encounters.detail.deleteConfirmMessage')}
    itemPreview={displayTitle}
    onConfirm={handleDelete}
    onClose={() => (showDeleteConfirm = false)}
  />
{/if}
