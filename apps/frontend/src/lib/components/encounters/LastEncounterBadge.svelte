<script lang="ts">
import { onMount } from 'svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { getLastEncounter } from '$lib/stores/encounters';
import type { LastEncounterSummary } from '$shared';

interface Props {
  friendId: string;
  friendName?: string;
}

let { friendId, friendName }: Props = $props();

let lastEncounter = $state<LastEncounterSummary | null>(null);
let isLoading = $state(true);
let error = $state<string | null>(null);

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

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
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
    title="Last seen: {lastEncounter.title}"
  >
    <Calendar class="w-4 h-4" strokeWidth="2" />
    <span>Last seen: {formatDate(lastEncounter.encounterDate)}</span>
  </a>
{:else}
  <a
    href="/encounters/new?friendId={friendId}{friendName ? `&friendName=${encodeURIComponent(friendName)}` : ''}"
    class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-500 font-body hover:bg-gray-100 hover:border-gray-300 transition-colors"
    title="Log an encounter with this friend"
  >
    <Plus class="w-4 h-4" strokeWidth="2" />
    <span>Log encounter</span>
  </a>
{/if}
