<script lang="ts">
import CheckCircle from 'svelte-heros-v2/CheckCircle.svelte';
import NoSymbol from 'svelte-heros-v2/NoSymbol.svelte';
import Tag from 'svelte-heros-v2/Tag.svelte';
import Trash from 'svelte-heros-v2/Trash.svelte';
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
                  <Tag class="w-4 h-4" strokeWidth="2" />
                </button>
              {/if}

              {#if onDeactivate}
                <button
                  type="button"
                  onclick={() => onDeactivate(member.id)}
                  class="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                  title={$i18n.t('collectives.deactivateMember')}
                >
                  <NoSymbol class="w-4 h-4" strokeWidth="2" />
                </button>
              {/if}

              {#if onRemove}
                <button
                  type="button"
                  onclick={() => onRemove(member.id)}
                  class="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title={$i18n.t('collectives.removeMember')}
                >
                  <Trash class="w-4 h-4" strokeWidth="2" />
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
                  <CheckCircle class="w-4 h-4" strokeWidth="2" />
                </button>
              {/if}

              {#if onRemove}
                <button
                  type="button"
                  onclick={() => onRemove(member.id)}
                  class="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title={$i18n.t('collectives.removeMember')}
                >
                  <Trash class="w-4 h-4" strokeWidth="2" />
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
