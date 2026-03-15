<script lang="ts">
import { onMount } from 'svelte';
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Home from 'svelte-heros-v2/Home.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import UserPlus from 'svelte-heros-v2/UserPlus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import {
  type AvailableCircleInfo,
  addAddress,
  addCollectiveToCircle,
  addEmail,
  addPhone,
  addUrl,
  type CollectiveCircleInfo,
  deleteAddress,
  deleteEmail,
  deletePhone,
  deleteUrl,
  getAvailableCircles,
  getCollectiveCircles,
  listAddresses,
  listEmails,
  listPhones,
  listUrls,
  removeCollectiveFromCircle,
  updateAddress,
  updateEmail,
  updatePhone,
  updateUrl,
} from '$lib/api/collectives';
import { createI18n } from '$lib/i18n/index.js';
import { collectives } from '$lib/stores/collectives';
import { isModalOpen, visibleMemberContactIds } from '$lib/stores/ui';
import type {
  Address,
  AddressInput,
  Collective,
  Email,
  EmailInput,
  MembershipDeactivate,
  Phone,
  PhoneInput,
  Url,
  UrlInput,
} from '$shared';
import {
  AddressEditForm,
  AddressRow,
  CircleEditForm,
  CircleRow,
  DeleteConfirmModal,
  DetailEditModal,
  EmailEditForm,
  EmailRow,
  PhoneEditForm,
  PhoneRow,
  UrlEditForm,
  UrlRow,
} from '../friends/subresources';
import AddMemberForm from './AddMemberForm.svelte';
import MemberList from './MemberList.svelte';

const i18n = createI18n();

type SubresourceType = 'phone' | 'email' | 'address' | 'url' | 'circle' | 'member';

interface Props {
  collective: Collective;
  onEdit?: () => void;
}

let { collective, onEdit }: Props = $props();

// Collective deletion
let isDeleting = $state(false);
let showDeleteConfirm = $state(false);

// Member management
let showAddMember = $state(false);
let showDeactivateModal = $state(false);
let deactivatingMemberId = $state<string | null>(null);
let deactivateReason = $state('');
let deactivateDate = $state(new Date().toISOString().split('T')[0]);

// Sub-resource state
let phones = $state<Phone[]>([]);
let emails = $state<Email[]>([]);
let addresses = $state<Address[]>([]);
let urls = $state<Url[]>([]);
let circles = $state<CollectiveCircleInfo[]>([]);
let availableCircles = $state<AvailableCircleInfo[]>([]);

// Editing state
let editingType = $state<SubresourceType | null>(null);
let editingId = $state<string | null>(null);
let editingData = $state<Phone | Email | Address | Url | null>(null);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);

// Subresource deletion state
let deleteType = $state<SubresourceType | null>(null);
let deleteId = $state<string | null>(null);
let deleteName = $state('');
let deletingPhoneId = $state<string | null>(null);
let deletingEmailId = $state<string | null>(null);
let deletingAddressId = $state<string | null>(null);
let deletingUrlId = $state<string | null>(null);
let deletingCircleId = $state<string | null>(null);

// Form refs
let phoneFormRef = $state<{ getData: () => PhoneInput; isValid: () => boolean } | null>(null);
let emailFormRef = $state<{ getData: () => EmailInput; isValid: () => boolean } | null>(null);
let addressFormRef = $state<{ getData: () => AddressInput; isValid: () => boolean } | null>(null);
let urlFormRef = $state<{ getData: () => UrlInput; isValid: () => boolean } | null>(null);
let circleFormRef = $state<{ getData: () => { circleId: string }; isValid: () => boolean } | null>(
  null,
);

// Load sub-resources on mount
$effect(() => {
  if (collective.id) {
    loadSubresources();
  }
});

async function loadSubresources() {
  try {
    const [
      phonesResult,
      emailsResult,
      addressesResult,
      urlsResult,
      circlesResult,
      availableResult,
    ] = await Promise.all([
      listPhones(collective.id),
      listEmails(collective.id),
      listAddresses(collective.id),
      listUrls(collective.id),
      getCollectiveCircles(collective.id),
      getAvailableCircles(collective.id),
    ]);
    phones = phonesResult;
    emails = emailsResult;
    addresses = addressesResult;
    urls = urlsResult;
    circles = circlesResult;
    availableCircles = availableResult;
  } catch (err) {
    console.error('Failed to load sub-resources:', err);
  }
}

// Icon component mapping for collective types
function getTypeIconComponent(typeName: string): typeof Home {
  switch (typeName.toLowerCase()) {
    case 'family':
      return Home;
    case 'company':
      return BuildingOffice;
    case 'club':
      return Users;
    case 'friend group':
      return Heart;
    default:
      return Users;
  }
}

function getTypeBadgeColor(typeName: string): string {
  switch (typeName.toLowerCase()) {
    case 'family':
      return 'bg-rose-100 text-rose-800';
    case 'company':
      return 'bg-blue-100 text-blue-800';
    case 'club':
      return 'bg-green-100 text-green-800';
    case 'friend group':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatAddress(c: Collective): string | null {
  const parts = [
    c.address.streetLine1,
    c.address.streetLine2,
    [c.address.postalCode, c.address.city].filter(Boolean).join(' '),
    c.address.stateProvince,
    c.address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

// Collective CRUD
async function handleDelete() {
  isDeleting = true;
  try {
    await collectives.deleteCollective(collective.id);
    goto('/collectives');
  } catch (err) {
    console.error('Failed to delete collective:', err);
    isDeleting = false;
    showDeleteConfirm = false;
  }
}

// Member management
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

async function handleDeactivateConfirm() {
  if (!deactivatingMemberId) return;
  const input: MembershipDeactivate = {
    reason: deactivateReason.trim() || null,
    inactive_date: deactivateDate || null,
  };
  try {
    await collectives.deactivateMember(collective.id, deactivatingMemberId, input);
    showDeactivateModal = false;
    deactivatingMemberId = null;
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

// Open edit modal
function openEditModal(type: SubresourceType, id?: string, data?: Phone | Email | Address | Url) {
  editingType = type;
  editingId = id ?? null;
  editingData = data ?? null;
  editError = null;
  isDirty = false;
  isModalOpen.set(true);
}

// Close edit modal
function closeEditModal() {
  editingType = null;
  editingId = null;
  editingData = null;
  editError = null;
  isDirty = false;
  isEditLoading = false;
  isModalOpen.set(false);
}

// Open delete confirmation
function openDeleteConfirm(type: SubresourceType, id: string, name: string) {
  deleteType = type;
  deleteId = id;
  deleteName = name;
}

// Close delete confirmation
function closeDeleteConfirm() {
  deleteType = null;
  deleteId = null;
  deleteName = '';
}

// Get modal title
function getModalTitle(): string {
  if (!editingType) return '';
  const action = editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add');
  const typeNames: Record<string, string> = {
    phone: $i18n.t('friendDetail.modal.phoneNumber'),
    email: $i18n.t('friendDetail.modal.emailAddress'),
    address: $i18n.t('friendDetail.modal.address'),
    url: $i18n.t('friendDetail.modal.websiteUrl'),
    circle: 'Circle',
    member: $i18n.t('collectives.addMember.title'),
  };
  if (editingType === 'member') return typeNames.member;
  if (editingType === 'circle') return `${$i18n.t('friendDetail.modal.add')} ${typeNames.circle}`;
  return `${action} ${typeNames[editingType] ?? editingType}`;
}

// Handle save
async function handleSave() {
  isEditLoading = true;
  editError = null;
  try {
    if (editingType === 'phone' && phoneFormRef?.isValid()) {
      const data = phoneFormRef.getData();
      if (editingId) {
        const updated = await updatePhone(collective.id, editingId, data);
        phones = phones.map((p) => (p.id === editingId ? updated : p));
      } else {
        const created = await addPhone(collective.id, data);
        phones = [...phones, created];
      }
    } else if (editingType === 'email' && emailFormRef?.isValid()) {
      const data = emailFormRef.getData();
      if (editingId) {
        const updated = await updateEmail(collective.id, editingId, data);
        emails = emails.map((e) => (e.id === editingId ? updated : e));
      } else {
        const created = await addEmail(collective.id, data);
        emails = [...emails, created];
      }
    } else if (editingType === 'address' && addressFormRef?.isValid()) {
      const data = addressFormRef.getData();
      if (editingId) {
        const updated = await updateAddress(collective.id, editingId, data);
        addresses = addresses.map((a) => (a.id === editingId ? updated : a));
      } else {
        const created = await addAddress(collective.id, data);
        addresses = [...addresses, created];
      }
    } else if (editingType === 'url' && urlFormRef?.isValid()) {
      const data = urlFormRef.getData();
      if (editingId) {
        const updated = await updateUrl(collective.id, editingId, data);
        urls = urls.map((u) => (u.id === editingId ? updated : u));
      } else {
        const created = await addUrl(collective.id, data);
        urls = [...urls, created];
      }
    } else if (editingType === 'circle' && circleFormRef?.isValid()) {
      const data = circleFormRef.getData();
      await addCollectiveToCircle(collective.id, data.circleId);
      await loadSubresources();
    } else {
      return;
    }
    closeEditModal();
  } catch (err) {
    editError = (err as Error).message || 'Failed to save';
  } finally {
    isEditLoading = false;
  }
}

// Handle subresource delete
async function handleSubresourceDelete() {
  if (!deleteType || !deleteId) return;
  try {
    switch (deleteType) {
      case 'phone':
        deletingPhoneId = deleteId;
        await deletePhone(collective.id, deleteId);
        phones = phones.filter((p) => p.id !== deleteId);
        break;
      case 'email':
        deletingEmailId = deleteId;
        await deleteEmail(collective.id, deleteId);
        emails = emails.filter((e) => e.id !== deleteId);
        break;
      case 'address':
        deletingAddressId = deleteId;
        await deleteAddress(collective.id, deleteId);
        addresses = addresses.filter((a) => a.id !== deleteId);
        break;
      case 'url':
        deletingUrlId = deleteId;
        await deleteUrl(collective.id, deleteId);
        urls = urls.filter((u) => u.id !== deleteId);
        break;
      case 'circle':
        deletingCircleId = deleteId;
        await removeCollectiveFromCircle(collective.id, deleteId);
        await loadSubresources();
        break;
    }
  } finally {
    deletingPhoneId = null;
    deletingEmailId = null;
    deletingAddressId = null;
    deletingUrlId = null;
    deletingCircleId = null;
    closeDeleteConfirm();
  }
}

let address = $derived(formatAddress(collective));

// Track visible member contact IDs for keyboard open mode
$effect(() => {
  const activeMembers = collective.members.filter((m) => m.isActive);
  const ids = activeMembers.map((m) => m.contact.id);
  visibleMemberContactIds.set(ids);
});

// Keyboard shortcut event listeners
onMount(() => {
  function handleAddPhoneShortcut() {
    openEditModal('phone');
  }
  function handleAddEmailShortcut() {
    openEditModal('email');
  }
  function handleAddAddressShortcut() {
    openEditModal('address');
  }
  function handleAddUrlShortcut() {
    openEditModal('url');
  }
  function handleAddCircleShortcut() {
    openEditModal('circle');
  }
  function handleAddMemberShortcut() {
    showAddMember = true;
    isModalOpen.set(true);
  }

  window.addEventListener('shortcut:collective-add-phone', handleAddPhoneShortcut);
  window.addEventListener('shortcut:collective-add-email', handleAddEmailShortcut);
  window.addEventListener('shortcut:collective-add-address', handleAddAddressShortcut);
  window.addEventListener('shortcut:collective-add-url', handleAddUrlShortcut);
  window.addEventListener('shortcut:collective-add-circle', handleAddCircleShortcut);
  window.addEventListener('shortcut:collective-add-member', handleAddMemberShortcut);

  return () => {
    window.removeEventListener('shortcut:collective-add-phone', handleAddPhoneShortcut);
    window.removeEventListener('shortcut:collective-add-email', handleAddEmailShortcut);
    window.removeEventListener('shortcut:collective-add-address', handleAddAddressShortcut);
    window.removeEventListener('shortcut:collective-add-url', handleAddUrlShortcut);
    window.removeEventListener('shortcut:collective-add-circle', handleAddCircleShortcut);
    window.removeEventListener('shortcut:collective-add-member', handleAddMemberShortcut);
  };
});
</script>

<div class="space-y-6">
  <!-- Header with type icon and actions -->
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <!-- Type icon as avatar -->
    <div class="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center {getTypeBadgeColor(collective.type.name)}">
      <svelte:component this={getTypeIconComponent(collective.type.name)} class="w-10 h-10" strokeWidth="2" />
    </div>

    <div class="flex-1 text-center sm:text-left">
      <h1 class="text-3xl font-heading text-gray-900">{collective.name}</h1>
      <div class="mt-1 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-sm font-body font-medium {getTypeBadgeColor(collective.type.name)}">
          {collective.type.name}
        </span>
        <span class="text-sm text-gray-500 font-body">
          {collective.activeMemberCount} {$i18n.t(collective.activeMemberCount === 1 ? 'collectives.member' : 'collectives.members')}
        </span>
      </div>
      {#if address}
        <div class="flex items-center gap-2 text-gray-600 font-body text-sm mt-2 justify-center sm:justify-start">
          <MapPin class="w-4 h-4 flex-shrink-0" strokeWidth="2" />
          <span>{address}</span>
        </div>
      {/if}
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        onclick={() => onEdit?.()}
        class="px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        {$i18n.t('common.edit')}
      </button>
      <button
        onclick={() => showDeleteConfirm = true}
        class="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-body font-semibold hover:bg-red-50 transition-colors"
      >
        {$i18n.t('common.delete')}
      </button>
    </div>
  </div>

  <!-- ==================== NOTES SECTION ==================== -->
  {#if collective.notes}
    <section class="space-y-2">
      <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
        <DocumentText class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('collectives.detail.notes')}
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg font-body text-gray-700 whitespace-pre-wrap">
        {collective.notes}
      </div>
    </section>
  {/if}

  <!-- ==================== CONTACT DETAILS SECTION ==================== -->
  <div class="space-y-4">
    <!-- Phone Numbers -->
    {#if phones.length > 0}
      <section class="space-y-2">
        <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
          <h2 class="text-lg font-heading flex items-center gap-2">
            <PhoneIcon class="w-5 h-5" strokeWidth="2" />
            {$i18n.t('friendDetail.sections.phoneNumbers')}
          </h2>
          <button
            type="button"
            onclick={() => openEditModal('phone')}
            class="text-sm font-body font-semibold text-white/90 hover:text-white
                   flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <Plus class="w-4 h-4" strokeWidth="2" />
            {$i18n.t('friendDetail.actions.addPhone')}
          </button>
        </div>
        <div class="space-y-2">
          {#each phones as phone (phone.id)}
            <PhoneRow
              {phone}
              onEdit={() => openEditModal('phone', phone.id, phone)}
              onDelete={() => openDeleteConfirm('phone', phone.id, phone.phoneNumber)}
              isDeleting={deletingPhoneId === phone.id}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Email Addresses -->
    {#if emails.length > 0}
      <section class="space-y-2">
        <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
          <h2 class="text-lg font-heading flex items-center gap-2">
            <Envelope class="w-5 h-5" strokeWidth="2" />
            {$i18n.t('friendDetail.sections.emailAddresses')}
          </h2>
          <button
            type="button"
            onclick={() => openEditModal('email')}
            class="text-sm font-body font-semibold text-white/90 hover:text-white
                   flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <Plus class="w-4 h-4" strokeWidth="2" />
            {$i18n.t('friendDetail.actions.addEmail')}
          </button>
        </div>
        <div class="space-y-2">
          {#each emails as email (email.id)}
            <EmailRow
              {email}
              onEdit={() => openEditModal('email', email.id, email)}
              onDelete={() => openDeleteConfirm('email', email.id, email.emailAddress)}
              isDeleting={deletingEmailId === email.id}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Addresses -->
    {#if addresses.length > 0}
      <section class="space-y-2">
        <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
          <h2 class="text-lg font-heading flex items-center gap-2">
            <MapPin class="w-5 h-5" strokeWidth="2" />
            {$i18n.t('friendDetail.sections.addresses')}
          </h2>
          <button
            type="button"
            onclick={() => openEditModal('address')}
            class="text-sm font-body font-semibold text-white/90 hover:text-white
                   flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <Plus class="w-4 h-4" strokeWidth="2" />
            {$i18n.t('friendDetail.actions.addAddress')}
          </button>
        </div>
        <div class="space-y-2">
          {#each addresses as addr (addr.id)}
            <AddressRow
              address={addr}
              onEdit={() => openEditModal('address', addr.id, addr)}
              onDelete={() => openDeleteConfirm('address', addr.id, addr.streetLine1 || addr.city || 'this address')}
              isDeleting={deletingAddressId === addr.id}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- URLs -->
    {#if urls.length > 0}
      <section class="space-y-2">
        <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
          <h2 class="text-lg font-heading flex items-center gap-2">
            <Link class="w-5 h-5" strokeWidth="2" />
            {$i18n.t('friendDetail.sections.websites')}
          </h2>
          <button
            type="button"
            onclick={() => openEditModal('url')}
            class="text-sm font-body font-semibold text-white/90 hover:text-white
                   flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <Plus class="w-4 h-4" strokeWidth="2" />
            {$i18n.t('friendDetail.actions.addUrl')}
          </button>
        </div>
        <div class="space-y-2">
          {#each urls as urlItem (urlItem.id)}
            <UrlRow
              url={urlItem}
              onEdit={() => openEditModal('url', urlItem.id, urlItem)}
              onDelete={() => openDeleteConfirm('url', urlItem.id, urlItem.url)}
              isDeleting={deletingUrlId === urlItem.id}
            />
          {/each}
        </div>
      </section>
    {/if}
  </div>

  <!-- ==================== CIRCLES SECTION ==================== -->
  {#if circles.length > 0}
    <section class="space-y-2">
      <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
        <h2 class="text-lg font-heading flex items-center gap-2">
          <Users class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('friendDetail.sections.circles')}
        </h2>
        <button
          type="button"
          onclick={() => openEditModal('circle')}
          class="text-sm font-body font-semibold text-white/90 hover:text-white
                 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <Plus class="w-4 h-4" strokeWidth="2" />
          {$i18n.t('friendDetail.actions.addCircle')}
        </button>
      </div>
      <div class="space-y-2">
        {#each circles as circle (circle.id)}
          <CircleRow
            {circle}
            onDelete={() => openDeleteConfirm('circle', circle.id, circle.name)}
            isDeleting={deletingCircleId === circle.id}
          />
        {/each}
      </div>
    </section>
  {/if}

  <!-- ==================== MEMBERS SECTION ==================== -->
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

  <!-- ==================== METADATA FOOTER ==================== -->
  <section class="text-sm text-gray-500 font-body">
    <div class="flex flex-wrap gap-4">
      <span>{$i18n.t('collectives.detail.created')} {new Date(collective.createdAt).toLocaleDateString()}</span>
      <span>{$i18n.t('collectives.detail.lastUpdated')} {new Date(collective.updatedAt).toLocaleDateString()}</span>
    </div>
  </section>
</div>

<!-- Add Member modal -->
{#if showAddMember}
  <DetailEditModal
    title={$i18n.t('collectives.addMember.title')}
    subtitle={collective.name}
    isLoading={false}
    onSave={() => {}}
    onClose={() => { showAddMember = false; isModalOpen.set(false); }}
    hideFooter
  >
    <AddMemberForm
      collectiveId={collective.id}
      roles={collective.type.roles}
      existingMemberContactIds={collective.members.map((m) => m.contact.id)}
      onAdd={handleAddMember}
      onCancel={() => { showAddMember = false; isModalOpen.set(false); }}
    />
  </DetailEditModal>
{/if}

<!-- Edit subresource modal -->
{#if editingType && editingType !== 'member'}
  <DetailEditModal
    title={getModalTitle()}
    subtitle={collective.name}
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeEditModal}
  >
    {#if editingType === 'phone'}
      <PhoneEditForm bind:this={phoneFormRef} initialData={editingData as Phone | undefined} defaultPrimary={!editingId && phones.length === 0} />
    {:else if editingType === 'email'}
      <EmailEditForm bind:this={emailFormRef} initialData={editingData as Email | undefined} defaultPrimary={!editingId && emails.length === 0} />
    {:else if editingType === 'address'}
      <AddressEditForm bind:this={addressFormRef} initialData={editingData as Address | undefined} defaultPrimary={!editingId && addresses.length === 0} />
    {:else if editingType === 'url'}
      <UrlEditForm bind:this={urlFormRef} initialData={editingData as Url | undefined} />
    {:else if editingType === 'circle'}
      <CircleEditForm
        bind:this={circleFormRef}
        existingCircles={circles}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {/if}
  </DetailEditModal>
{/if}

<!-- Delete subresource confirmation -->
{#if deleteType && deleteId}
  <DeleteConfirmModal
    title="{deleteType === 'circle' ? 'Remove from' : 'Delete'} {deleteType === 'phone' ? 'Phone Number' : deleteType === 'email' ? 'Email Address' : deleteType === 'address' ? 'Address' : deleteType === 'url' ? 'Website' : 'Circle'}"
    description={deleteType === 'circle' ? 'Are you sure you want to remove this collective from this circle?' : `Are you sure you want to delete this ${deleteType}?`}
    itemPreview={deleteName}
    onConfirm={handleSubresourceDelete}
    onClose={closeDeleteConfirm}
  />
{/if}

<!-- Delete collective confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
      <h3 class="text-xl font-heading text-gray-900 mb-2">{$i18n.t('collectives.detail.deleteConfirmTitle')}</h3>
      <p class="text-gray-600 font-body mb-6">
        {$i18n.t('collectives.detail.deleteConfirmMessage', { name: collective.name })}
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => showDeleteConfirm = false}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {$i18n.t('collectives.form.cancel')}
        </button>
        <button
          onclick={handleDelete}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? $i18n.t('collectives.detail.deleting') : $i18n.t('collectives.detail.delete')}
        </button>
      </div>
    </div>
  </div>
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
          onclick={() => { showDeactivateModal = false; deactivatingMemberId = null; }}
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
