<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import UserPlus from 'svelte-heros-v2/UserPlus.svelte';
import {
  Button,
  ConfirmDialog,
  FormInput,
  headingClasses,
  Modal,
  surfaceClasses,
} from '$lib/components/ui';
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

// Member removal confirmation (ConfirmDialog owns the in-flight state)
let removeConfirmMemberId = $state<string | null>(null);
let removeConfirmMemberName = $derived(
  collective.members.find((m) => m.id === removeConfirmMemberId)?.contact.displayName,
);

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
    // The deactivate modal and the remove confirmation clear `isModalOpen`
    // themselves when they unmount; only the add-member flag is manual.
    const hadAddMemberOpen = showAddMember;
    showAddMember = false;
    showDeactivateModal = false;
    deactivatingMemberId = null;
    deactivateReason = '';
    removeConfirmMemberId = null;
    if (hadAddMemberOpen) isModalOpen.set(false);
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
}

function closeDeactivateModal() {
  showDeactivateModal = false;
  deactivatingMemberId = null;
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

function openRemoveConfirm(memberId: string) {
  removeConfirmMemberId = memberId;
}

async function handleRemoveConfirm() {
  const memberId = removeConfirmMemberId;
  if (memberId === null) return;
  try {
    await collectives.removeMember(collective.id, memberId);
  } catch (err) {
    console.error('Failed to remove member:', err);
    // Rethrow so the dialog stays open and shows the reason.
    throw err;
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
  <div class={surfaceClasses.section}>
    <h2 class="{headingClasses.section} flex items-center gap-2">
      <UserPlus class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('collectives.detail.members')}
      <span class="text-sm font-body font-normal text-forest/70">({collective.activeMemberCount})</span>
    </h2>
    <Button
      variant="ghostAccent"
      size="xs"
      onclick={() => { showAddMember = true; isModalOpen.set(true); }}
      data-shortcut="a m"
      data-shortcut-label="shortcuts.add.member"
    >
      <Plus class="w-4 h-4" strokeWidth="2" />
      {$i18n.t('collectives.addMember.button')}
    </Button>
  </div>

  <MemberList
    members={collective.members}
    onDeactivate={handleDeactivateClick}
    onReactivate={handleReactivate}
    onRemove={openRemoveConfirm}
  />
</section>

<!-- Add Member modal -->
{#if showAddMember}
  <DetailEditModal
    title={$i18n.t('collectives.addMember.title')}
    subtitle={collective.name}
    onClose={() => { showAddMember = false; isModalOpen.set(false); }}
    footer={null}
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

<!-- Deactivate member modal: two fields, so a Modal rather than a ConfirmDialog -->
{#if showDeactivateModal}
  <Modal
    title={$i18n.t('collectives.deactivate.title')}
    size="md"
    onClose={closeDeactivateModal}
  >
    <p class="text-sm text-gray-600 font-body">
      {$i18n.t('collectives.deactivate.message')}
    </p>

    <div class="mt-4 space-y-4">
      <FormInput
        id="deactivate-reason"
        size="sm"
        label={$i18n.t('collectives.deactivate.reasonLabel')}
        optional
        optionalText={$i18n.t('collectives.form.optional')}
        bind:value={deactivateReason}
        placeholder={$i18n.t('collectives.deactivate.reasonPlaceholder')}
      />

      <FormInput
        id="deactivate-date"
        size="sm"
        type="date"
        label={$i18n.t('collectives.deactivate.dateLabel')}
        bind:value={deactivateDate}
      />
    </div>

    {#snippet footer()}
      <Button variant="secondary" size="sm" class="ml-auto" onclick={closeDeactivateModal}>
        {$i18n.t('collectives.form.cancel')}
      </Button>
      <Button variant="caution" size="sm" onclick={handleDeactivateConfirm}>
        {$i18n.t('collectives.deactivate.confirm')}
      </Button>
    {/snippet}
  </Modal>
{/if}

<!-- Remove member confirmation -->
{#if removeConfirmMemberId !== null}
  <ConfirmDialog
    title={$i18n.t('collectives.removeMember')}
    description={$i18n.t('collectives.removeMemberConfirm')}
    itemPreview={removeConfirmMemberName}
    confirmLabel={$i18n.t('common.remove')}
    onConfirm={handleRemoveConfirm}
    onClose={() => (removeConfirmMemberId = null)}
  />
{/if}
