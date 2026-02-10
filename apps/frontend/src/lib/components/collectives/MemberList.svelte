<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import { isOpenMemberModeActive, openMemberModePrefix } from '$lib/stores/ui';
import type { CollectiveMember } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';
import KeyboardHintBadge from '../KeyboardHintBadge.svelte';

const i18n = createI18n();

interface Props {
  members: CollectiveMember[];
  showInactive?: boolean;
  onDeactivate?: (memberId: string) => void;
  onReactivate?: (memberId: string) => void;
  onRemove?: (memberId: string) => void;
  onRoleChange?: (memberId: string) => void;
}

let {
  members,
  showInactive = true,
  onDeactivate,
  onReactivate,
  onRemove,
  onRoleChange,
}: Props = $props();

let activeMembers = $derived(members.filter((m) => m.isActive));
let inactiveMembers = $derived(members.filter((m) => !m.isActive));

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<div class="space-y-6">
  <!-- Active members -->
  <div>
    <h3 class="text-sm font-body font-medium text-gray-700 mb-3">
      {$i18n.t('collectives.activeMembers')} ({activeMembers.length})
    </h3>

    {#if activeMembers.length === 0}
      <p class="text-sm text-gray-500 font-body italic py-4">
        {$i18n.t('collectives.noActiveMembers')}
      </p>
    {:else}
      <div class="space-y-2">
        {#each activeMembers as member, index (member.id)}
          <div class="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors relative">
            <KeyboardHintBadge {index} isActive={$isOpenMemberModeActive} prefix={$openMemberModePrefix} variant="card" />
            <a href="/friends/{member.contact.id}" class="flex items-center gap-3 flex-1 min-w-0">
              <FriendAvatar
                displayName={member.contact.displayName}
                photoUrl={member.contact.photoUrl}
                size="md"
              />
              <div class="min-w-0">
                <div class="font-body font-medium text-gray-900 truncate">
                  {member.contact.displayName}
                </div>
                <div class="text-xs text-gray-500 font-body">
                  {member.role.label}
                  {#if member.joinedDate}
                    <span class="text-gray-400">
                      &middot; {$i18n.t('collectives.joinedOn', { date: formatDate(member.joinedDate) })}
                    </span>
                  {/if}
                </div>
              </div>
            </a>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              {#if onRoleChange}
                <button
                  type="button"
                  onclick={() => onRoleChange(member.id)}
                  class="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title={$i18n.t('collectives.changeRole')}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </button>
              {/if}

              {#if onDeactivate}
                <button
                  type="button"
                  onclick={() => onDeactivate(member.id)}
                  class="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                  title={$i18n.t('collectives.deactivateMember')}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              {/if}

              {#if onRemove}
                <button
                  type="button"
                  onclick={() => onRemove(member.id)}
                  class="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title={$i18n.t('collectives.removeMember')}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Inactive members -->
  {#if showInactive && inactiveMembers.length > 0}
    <div>
      <h3 class="text-sm font-body font-medium text-gray-500 mb-3">
        {$i18n.t('collectives.inactiveMembers')} ({inactiveMembers.length})
      </h3>

      <div class="space-y-2">
        {#each inactiveMembers as member (member.id)}
          <div class="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-70">
            <a href="/friends/{member.contact.id}" class="flex items-center gap-3 flex-1 min-w-0">
              <FriendAvatar
                displayName={member.contact.displayName}
                photoUrl={member.contact.photoUrl}
                size="md"
              />
              <div class="min-w-0">
                <div class="font-body font-medium text-gray-700 truncate">
                  {member.contact.displayName}
                </div>
                <div class="text-xs text-gray-500 font-body">
                  {member.role.label}
                  {#if member.inactiveDate}
                    <span class="text-gray-400">
                      &middot; {$i18n.t('collectives.leftOn', { date: formatDate(member.inactiveDate) })}
                    </span>
                  {/if}
                  {#if member.inactiveReason}
                    <span class="text-gray-400 italic">
                      - {member.inactiveReason}
                    </span>
                  {/if}
                </div>
              </div>
            </a>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              {#if onReactivate}
                <button
                  type="button"
                  onclick={() => onReactivate(member.id)}
                  class="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                  title={$i18n.t('collectives.reactivateMember')}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              {/if}

              {#if onRemove}
                <button
                  type="button"
                  onclick={() => onRemove(member.id)}
                  class="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title={$i18n.t('collectives.removeMember')}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
