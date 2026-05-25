<script lang="ts">
import { onMount } from 'svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { getLastEncounter } from '$lib/stores/encounters';
import type { LastEncounterSummary } from '$shared';
import { encounterDisplayTitle } from './encounter-display';

const i18n = createI18n();

interface Props {
  friendId: string;
  friendName?: string;
}

let { friendId, friendName }: Props = $props();

let lastEncounter = $state<LastEncounterSummary | null>(null);
let isLoading = $state(true);
let error = $state<string | null>(null);

let displayTitle = $derived(
  lastEncounter
    ? encounterDisplayTitle($i18n.t, {
        ...lastEncounter,
        friends: friendName ? [{ displayName: friendName }] : [],
      })
    : '',
);

onMount(async () => {
  try {
    lastEncounter = await getLastEncounter(friendId);
  } catch (err) {
    error = (err as Error)?.message || 'Failed to load';
  } finally {
    isLoading = false;
  }
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return $i18n.t('encounters.lastSeen.today');
  if (diffDays === 1) return $i18n.t('encounters.lastSeen.yesterday');
  if (diffDays < 7) return $i18n.t('encounters.lastSeen.daysAgo', { count: diffDays });
  if (diffDays < 30) {
    return $i18n.t('encounters.lastSeen.weeksAgo', { count: Math.floor(diffDays / 7) });
  }
  if (diffDays < 365) {
    return $i18n.t('encounters.lastSeen.monthsAgo', { count: Math.floor(diffDays / 30) });
  }
  return $i18n.t('encounters.lastSeen.yearsAgo', { count: Math.floor(diffDays / 365) });
}

function getDateColor(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return 'text-green-600 bg-green-50 border-green-200';
  } else if (diffDays < 90) {
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  } else if (diffDays < 180) {
    return 'text-orange-600 bg-orange-50 border-orange-200';
  } else {
    return 'text-red-600 bg-red-50 border-red-200';
  }
}
</script>

{#if isLoading}
  <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
    <div class="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>
  </div>
{:else if error}
  <!-- Silent fail - don't show error for this optional component -->
{:else if lastEncounter}
  <a
    href="/encounters/{lastEncounter.id}"
    class="inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm font-body transition-colors hover:opacity-80 {getDateColor(lastEncounter.encounterDate)}"
    title="{$i18n.t('encounters.lastSeen.label')}: {displayTitle}"
  >
    <Calendar class="w-4 h-4" strokeWidth="2" />
    <span>{$i18n.t('encounters.lastSeen.label')}: {formatDate(lastEncounter.encounterDate)}</span>
  </a>
{:else}
  <a
    href="/encounters/new?friendId={friendId}{friendName ? `&friendName=${encodeURIComponent(friendName)}` : ''}"
    class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-500 font-body hover:bg-gray-100 hover:border-gray-300 transition-colors"
    title={$i18n.t('aria.logEncounter')}
  >
    <Plus class="w-4 h-4" strokeWidth="2" />
    <span>{$i18n.t('encounters.logEncounter')}</span>
  </a>
{/if}
