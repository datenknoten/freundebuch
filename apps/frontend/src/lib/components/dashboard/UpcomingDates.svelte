<script lang="ts">
import { getUpcomingDates } from '$lib/api/contacts.js';
import ContactAvatar from '$lib/components/contacts/ContactAvatar.svelte';
import type { DateType, UpcomingDate } from '$shared';

interface Props {
  days?: number;
  limit?: number;
}

let { days = 30, limit = 10 }: Props = $props();

let upcomingDates = $state<UpcomingDate[]>([]);
let isLoading = $state(true);
let error = $state<string | null>(null);

async function loadUpcomingDates() {
  isLoading = true;
  error = null;
  try {
    upcomingDates = await getUpcomingDates({ days, limit });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load upcoming dates';
  } finally {
    isLoading = false;
  }
}

$effect(() => {
  loadUpcomingDates();
});

function formatDateType(type: DateType): string {
  const typeLabels: Record<DateType, string> = {
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    other: 'Date',
  };
  return typeLabels[type] || type;
}

function formatDate(dateValue: string): string {
  try {
    const d = new Date(dateValue);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateValue;
  }
}

function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) {
    return 'Today';
  } else if (daysUntil === 1) {
    return 'Tomorrow';
  } else if (daysUntil <= 7) {
    return `In ${daysUntil} days`;
  } else if (daysUntil <= 14) {
    return 'Next week';
  } else {
    return `In ${daysUntil} days`;
  }
}

function getDaysUntilClass(daysUntil: number): string {
  if (daysUntil === 0) {
    return 'bg-forest text-white';
  } else if (daysUntil <= 7) {
    return 'bg-sage-light text-forest';
  } else {
    return 'bg-gray-100 text-gray-600';
  }
}
</script>

<div class="bg-white rounded-xl shadow-lg p-6">
  <h3 class="text-xl font-heading text-gray-800 mb-4">Upcoming Dates</h3>

  {#if isLoading}
    <div class="animate-pulse space-y-3">
      {#each Array(3) as _}
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div class="flex-1">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="text-red-600 text-sm">{error}</div>
  {:else if upcomingDates.length === 0}
    <div class="text-center py-6">
      <div class="text-gray-400 text-4xl mb-2">&#128197;</div>
      <p class="text-gray-500 font-body">No upcoming dates in the next {days} days</p>
      <p class="text-gray-400 text-sm mt-1">Add birthdays and anniversaries to your contacts</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each upcomingDates as date (date.id)}
        <a
          href="/contacts/{date.contact.id}"
          class="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ContactAvatar
            displayName={date.contact.displayName}
            photoUrl={date.contact.photoThumbnailUrl}
            size="sm"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-body font-medium text-gray-900 truncate">
                {date.contact.displayName}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full font-body {getDaysUntilClass(date.daysUntil)}">
                {formatDaysUntil(date.daysUntil)}
              </span>
            </div>
            <div class="text-sm text-gray-500 font-body">
              {formatDateType(date.dateType)}
              {#if date.label} - {date.label}{/if}
              <span class="mx-1">&#183;</span>
              {formatDate(date.dateValue)}
            </div>
          </div>
        </a>
      {/each}
    </div>

    {#if upcomingDates.length >= limit}
      <div class="mt-4 pt-4 border-t border-gray-100 text-center">
        <a href="/contacts" class="text-sm text-forest hover:text-forest-light font-body">
          View all contacts
        </a>
      </div>
    {/if}
  {/if}
</div>
