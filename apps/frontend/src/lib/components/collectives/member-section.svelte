<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import UserPlus from 'svelte-heros-v2/UserPlus.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { collectives } from '$lib/stores/collectives';
import { isModalOpen, visibleMemberContactIds } from '$lib/stores/ui';
import type { Collective, MembershipDeactivate } from '$shared';
import { DetailEditModal } from '../friends/subresources';
import AddMemberForm from './add-member-form.svelte';
import MemberList from './member-list.svelte';

const i18n = createI18n();

interface Props {
  collective: Collective;
}

let { collective }: Props = $props();

// Member management
let showAddMember = $state(false);
let showDeactivateModal = $state(false);
let deactivatingMemberId = $state<string | null>(null);
let deactivateReason = $state('');
let deactivateDate = $state(new Date().toISOString().split('T')[0]);

// Track visible member contact IDs for keyboard open mode
$effect(() => {
  const activeMembers = collective.members.filter((m) => m.isActive);
  const ids = activeMembers.map((m) => m.contact.id);
  visibleMemberContactIds.set(ids);
});

// Reset modal state when the collective changes. The route can swap the
// collective prop without unmounting this component; a lingering add/deactivate
// modal would otherwise show stale member IDs and confirm against the new
// collective.id.
let activeCollectiveId: string | undefined;
$effect(() => {
  const id = collective.id;
  if (activeCollectiveId !== undefined && id !== activeCollectiveId) {
    const hadModalOpen = showAddMember || showDeactivateModal;
    showAddMember = false;
    showDeactivateModal = false;
    deactivatingMemberId = null;
    deactivateReason = '';
    if (hadModalOpen) isModalOpen.set(false);
  }
  activeCollectiveId = id;
});

async function handleAddMember(contactId: string, roleId: string, skipAutoRelationships?: boolean) {
  await collectives.addMember(collective.id, {
    friend_id: contactId,
    role_id: roleId,
    skip_auto_relationships: skipAutoRelationships,
  });
  showAddMember = false;
  isModalOpen.set(false);
}

function handleDeactivateClick(memberId: string) {
  deactivatingMemberId = memberId;
  deactivateReason = '';
  deactivateDate = new Date().toISOString().split('T')[0];
  showDeactivateModal = true;
  isModalOpen.set(true);
}

function closeDeactivateModal() {
  showDeactivateModal = false;
  deactivatingMemberId = null;
  isModalOpen.set(false);
}

async function handleDeactivateConfirm() {
  if (!deactivatingMemberId) return;
  const trimmedReason = deactivateReason.trim();
  const input: MembershipDeactivate = {
    reason: trimmedReason.length > 0 ? trimmedReason : null,
    inactive_date: deactivateDate === '' ? null : deactivateDate,
  };
  try {
    await collectives.deactivateMember(collective.id, deactivatingMemberId, input);
    closeDeactivateModal();
  } catch (err) {
    console.error('Failed to deactivate member:', err);
  }
}

async function handleReactivate(memberId: string) {
  try {
    await collectives.reactivateMember(collective.id, memberId);
  } catch (err) {
    console.error('Failed to reactivate member:', err);
  }
}

async function handleRemove(memberId: string) {
  if (!confirm($i18n.t('collectives.removeMemberConfirm'))) return;
  try {
    await collectives.removeMember(collective.id, memberId);
  } catch (err) {
    console.error('Failed to remove member:', err);
  }
}

// Keyboard shortcut: open the add-member modal
onMount(() => {
  function handleAddMemberShortcut() {
    showAddMember = true;
    isModalOpen.set(true);
  }
  window.addEventListener('shortcut:collective-add-member', handleAddMemberShortcut);
  return () => {
    window.removeEventListener('shortcut:collective-add-member', handleAddMemberShortcut);
  };
});
</script>

<section class="space-y-2">
  <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
    <h2 class="text-lg font-heading flex items-center gap-2">
      <UserPlus class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('collectives.detail.members')}
      <span class="text-sm font-body font-normal text-white/80">({collective.activeMemberCount})</span>
    </h2>
    <button
      type="button"
      onclick={() => { showAddMember = true; isModalOpen.set(true); }}
      class="text-sm font-body font-semibold text-white/90 hover:text-white
             flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      data-shortcut="a m"
      data-shortcut-label="shortcuts.add.member"
    >
      <Plus class="w-4 h-4" strokeWidth="2" />
      {$i18n.t('collectives.addMember.button')}
    </button>
  </div>

  <MemberList
    members={collective.members}
    onDeactivate={handleDeactivateClick}
    onReactivate={handleReactivate}
    onRemove={handleRemove}
  />
</section>

<!-- Add Member modal -->
{#if showAddMember}
  <DetailEditModal
    title={$i18n.t('collectives.addMember.title')}
    subtitle={collective.name}
    isLoading={false}
    onSave={() => {}}
    onClose={() => { showAddMember = false; isModalOpen.set(false); }}
    hideFooter
    asForm={false}
  >
    <AddMemberForm
      collectiveId={collective.id}
      collectiveName={collective.name}
      roles={collective.type.roles}
      existingMemberContactIds={collective.members.map((m) => m.contact.id)}
      onAdd={handleAddMember}
      onCancel={() => { showAddMember = false; isModalOpen.set(false); }}
    />
  </DetailEditModal>
{/if}

<!-- Deactivate member modal -->
{#if showDeactivateModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="deactivate-modal-title"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <h3 id="deactivate-modal-title" class="text-lg font-heading font-semibold text-gray-900">
        {$i18n.t('collectives.deactivate.title')}
      </h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        {$i18n.t('collectives.deactivate.message')}
      </p>

      <div class="mt-4 space-y-4">
        <div>
          <label for="deactivate-reason" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('collectives.deactivate.reasonLabel')} <span class="text-gray-400">{$i18n.t('collectives.form.optional')}</span>
          </label>
          <input
            id="deactivate-reason"
            type="text"
            bind:value={deactivateReason}
            placeholder={$i18n.t('collectives.deactivate.reasonPlaceholder')}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
        </div>

        <div>
          <label for="deactivate-date" class="block text-sm font-body font-medium text-gray-700 mb-1">
            {$i18n.t('collectives.deactivate.dateLabel')}
          </label>
          <input
            id="deactivate-date"
            type="date"
            bind:value={deactivateDate}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
        </div>
      </div>

      <div class="mt-6 flex gap-3 justify-end">
        <button
          type="button"
          onclick={closeDeactivateModal}
          class="px-4 py-2 border border-gray-300 rounded-lg font-body text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {$i18n.t('collectives.form.cancel')}
        </button>
        <button
          type="button"
          onclick={handleDeactivateConfirm}
          class="px-4 py-2 bg-amber-600 text-white rounded-lg font-body text-sm font-semibold hover:bg-amber-700 transition-colors"
        >
          {$i18n.t('collectives.deactivate.confirm')}
        </button>
      </div>
    </div>
  </div>
{/if}
