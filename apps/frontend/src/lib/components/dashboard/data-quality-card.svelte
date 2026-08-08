<script lang="ts">
import { setDqNotApplicable, snoozeDqItem } from '$lib/api/data-quality.js';
import FriendAvatar from '$lib/components/friends/friend-avatar.svelte';
import { createI18n } from '$lib/i18n/index.js';
import {
  DQ_FIELD_CATALOG,
  type DqFieldKey,
  type DqReason,
  type DqSuggestionItem,
  type DqSuggestionsResponse,
} from '$shared';

const i18n = createI18n();

/**
 * Hard cap on rendered suggestions. The request asks for the same number, but
 * the slice is what actually guarantees it.
 */
const DQ_DASHBOARD_LIMIT = 5;

/** The first press always asks for 30 days; the server escalates a repeat to 90. */
const SNOOZE_DAYS = 30;

interface Props {
  suggestions?: DqSuggestionsResponse | null;
  isLoading?: boolean;
  error?: string | null;
  /** Called when the user retries after an error. */
  onRetry?: () => void;
  /** Called after a snooze or "doesn't apply" so the parent can refetch. */
  onChanged?: () => void;
}

let { suggestions = null, isLoading = false, error = null, onRetry, onChanged }: Props = $props();

let activeBucket = $state<'quickwins' | 'worthwhile'>('quickwins');
let pendingKey = $state<string | null>(null);
let actionError = $state<string | null>(null);

const visibleItems = $derived<DqSuggestionItem[]>(
  (activeBucket === 'quickwins'
    ? (suggestions?.quickWins ?? [])
    : (suggestions?.worthwhile ?? []).flatMap((entry) => entry.items)
  ).slice(0, DQ_DASHBOARD_LIMIT),
);

function itemKey(item: DqSuggestionItem): string {
  return `${item.friendId}:${item.fieldKey}`;
}

function fieldLabel(fieldKey: DqFieldKey): string {
  const definition = DQ_FIELD_CATALOG.find((entry) => entry.key === fieldKey);
  return definition === undefined ? fieldKey : $i18n.t(definition.i18nKey);
}

/** `?add=` deep link into the matching add-form, or a plain link when none exists. */
function friendHref(item: DqSuggestionItem): string {
  const addTarget = DQ_FIELD_CATALOG.find((entry) => entry.key === item.fieldKey)?.addTarget;
  return addTarget == null
    ? `/friends/${item.friendId}`
    : `/friends/${item.friendId}?add=${addTarget}`;
}

function stateLabel(item: DqSuggestionItem): string {
  const field = fieldLabel(item.fieldKey);

  if (!item.isStale) {
    return $i18n.t('dataQuality.state.missing', { field });
  }

  const months = Math.round((item.staleDays ?? 0) / 30);
  return $i18n.t('dataQuality.state.stale', { field, count: months });
}

function reasonLabel(reason: DqReason): string {
  switch (reason.kind) {
    case 'birthday_soon':
      return $i18n.t('dataQuality.reasons.birthdaySoon', { count: reason.days });
    case 'upcoming_encounter':
      return $i18n.t('dataQuality.reasons.upcomingEncounter', { count: reason.days });
    case 'recent_encounter':
      return $i18n.t('dataQuality.reasons.recentEncounter');
    case 'new_friend':
      return $i18n.t('dataQuality.reasons.newFriend');
  }
}

async function runAction(item: DqSuggestionItem, action: () => Promise<unknown>): Promise<void> {
  pendingKey = itemKey(item);
  actionError = null;

  try {
    await action();
    onChanged?.();
  } catch {
    // Keep the card rendered: a failed deferral must not blank the list.
    actionError = $i18n.t('dataQuality.actionFailed');
  } finally {
    pendingKey = null;
  }
}

function snoozeLater(item: DqSuggestionItem): Promise<void> {
  return runAction(item, () =>
    snoozeDqItem({
      friendId: item.friendId,
      fieldKey: item.fieldKey,
      days: SNOOZE_DAYS,
      reason: 'later',
    }),
  );
}

function markNotApplicable(item: DqSuggestionItem): Promise<void> {
  return runAction(item, () =>
    setDqNotApplicable({ friendId: item.friendId, fieldKey: item.fieldKey, value: true }),
  );
}
</script>

<div class="bg-white rounded-xl shadow-lg p-6">
  <h3 class="text-xl font-heading text-gray-800 mb-4">{$i18n.t('dataQuality.title')}</h3>

  <div class="flex gap-2 mb-4">
    <button
      type="button"
      onclick={() => (activeBucket = 'quickwins')}
      class="text-sm font-body px-3 py-1.5 rounded-lg transition-colors {activeBucket ===
      'quickwins'
        ? 'bg-forest/10 text-forest'
        : 'text-gray-500 hover:bg-gray-50'}"
      aria-pressed={activeBucket === 'quickwins'}
    >
      {$i18n.t('dataQuality.tabs.quickWins')}
    </button>
    <button
      type="button"
      onclick={() => (activeBucket = 'worthwhile')}
      class="text-sm font-body px-3 py-1.5 rounded-lg transition-colors {activeBucket ===
      'worthwhile'
        ? 'bg-forest/10 text-forest'
        : 'text-gray-500 hover:bg-gray-50'}"
      aria-pressed={activeBucket === 'worthwhile'}
    >
      {$i18n.t('dataQuality.tabs.worthwhile')}
    </button>
  </div>

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
    {#if onRetry}
      <button
        type="button"
        onclick={onRetry}
        class="mt-3 text-sm font-body text-forest hover:text-forest-light"
      >
        {$i18n.t('common.retry')}
      </button>
    {/if}
  {:else if visibleItems.length === 0}
    <div class="text-center py-6">
      <p class="text-gray-500 font-body">{$i18n.t('dataQuality.empty')}</p>
    </div>
  {:else}
    <ul class="space-y-3">
      {#each visibleItems as item (itemKey(item))}
        <li class="flex items-start gap-3">
          <FriendAvatar
            displayName={item.friendDisplayName}
            photoUrl={item.photoThumbnailUrl}
            size="sm"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <a
                href="/friends/{item.friendId}"
                class="font-body font-medium text-gray-900 truncate hover:text-forest"
              >
                {item.friendDisplayName}
              </a>
              {#if item.reasons.length > 0}
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-body">
                  {reasonLabel(item.reasons[0])}
                </span>
              {/if}
            </div>
            <div class="text-sm text-gray-500 font-body">{stateLabel(item)}</div>
            <div class="flex gap-3 mt-1">
              <a
                href={friendHref(item)}
                class="text-sm font-body text-forest hover:text-forest-light"
              >
                {$i18n.t('dataQuality.actions.fill')}
              </a>
              <button
                type="button"
                onclick={() => snoozeLater(item)}
                disabled={pendingKey === itemKey(item)}
                class="text-sm font-body text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {$i18n.t('dataQuality.actions.later')}
              </button>
              <button
                type="button"
                onclick={() => markNotApplicable(item)}
                disabled={pendingKey === itemKey(item)}
                class="text-sm font-body text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {$i18n.t('dataQuality.actions.notApplicable')}
              </button>
            </div>
          </div>
        </li>
      {/each}
    </ul>

    {#if actionError}
      <p class="mt-3 text-sm font-body text-gray-600">{actionError}</p>
    {/if}
  {/if}
</div>
