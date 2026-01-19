<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';

const i18n = createI18n();
import type {
  Address,
  AddressInput,
  CircleSummary,
  DateInput,
  Email,
  EmailInput,
  Friend,
  FriendDate,
  Phone,
  PhoneInput,
  ProfessionalHistory,
  ProfessionalHistoryInput,
  SocialProfile,
  SocialProfileInput,
  Url,
  UrlInput,
} from '$shared';
import FriendAvatar from './FriendAvatar.svelte';
import RelationshipsSection from './RelationshipsSection.svelte';
import {
  AddressEditForm,
  AddressRow,
  CircleEditForm,
  CircleRow,
  DateEditForm,
  DateRow,
  DeleteConfirmModal,
  DetailEditModal,
  EmailEditForm,
  EmailRow,
  PhoneEditForm,
  PhoneRow,
  ProfessionalHistoryEditForm,
  ProfessionalHistoryRow,
  SocialProfileEditForm,
  SocialProfileRow,
  type SubresourceType,
  UrlEditForm,
  UrlRow,
} from './subresources';

interface Props {
  friend: Friend;
}

let { friend }: Props = $props();

// Friend deletion state
let isDeleting = $state(false);
let showDeleteConfirm = $state(false);

// Subresource editing state
let editingType = $state<SubresourceType | null>(null);
let editingId = $state<string | null>(null); // null = add new
let editingData = $state<
  Phone | Email | Address | Url | FriendDate | SocialProfile | ProfessionalHistory | null
>(null);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);

// Subresource deletion state
let deleteType = $state<SubresourceType | null>(null);
let deleteId = $state<string | null>(null);
let deleteName = $state('');

// Subresource-specific deletion loading state
let deletingPhoneId = $state<string | null>(null);
let deletingEmailId = $state<string | null>(null);
let deletingAddressId = $state<string | null>(null);
let deletingUrlId = $state<string | null>(null);
let deletingDateId = $state<string | null>(null);
let deletingSocialId = $state<string | null>(null);
let deletingCircleId = $state<string | null>(null);
let deletingProfessionalId = $state<string | null>(null);

// Form component references
let phoneFormRef = $state<{ getData: () => PhoneInput; isValid: () => boolean } | null>(null);
let emailFormRef = $state<{ getData: () => EmailInput; isValid: () => boolean } | null>(null);
let addressFormRef = $state<{ getData: () => AddressInput; isValid: () => boolean } | null>(null);
let urlFormRef = $state<{ getData: () => UrlInput; isValid: () => boolean } | null>(null);
let dateFormRef = $state<{ getData: () => DateInput; isValid: () => boolean } | null>(null);
let socialFormRef = $state<{ getData: () => SocialProfileInput; isValid: () => boolean } | null>(
  null,
);
let circleFormRef = $state<{ getData: () => { circleId: string }; isValid: () => boolean } | null>(
  null,
);
let professionalFormRef = $state<{
  getData: () => ProfessionalHistoryInput;
  isValid: () => boolean;
} | null>(null);

// Friend delete handler
async function handleDelete() {
  isDeleting = true;
  try {
    await friends.deleteFriend(friend.id);
    goto('/friends');
  } catch (error) {
    console.error('Failed to delete friend:', error);
    isDeleting = false;
    showDeleteConfirm = false;
  }
}

// Open edit modal
function openEditModal(
  type: SubresourceType,
  id?: string,
  data?: Phone | Email | Address | Url | FriendDate | SocialProfile | ProfessionalHistory,
) {
  editingType = type;
  editingId = id ?? null;
  editingData = data ?? null;
  editError = null;
  isDirty = false;
}

// Close edit modal
function closeEditModal() {
  editingType = null;
  editingId = null;
  editingData = null;
  editError = null;
  isDirty = false;
  isEditLoading = false;
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

// Handle save
async function handleSave() {
  isEditLoading = true;
  editError = null;

  try {
    if (editingType === 'phone' && phoneFormRef) {
      const data = phoneFormRef.getData();
      if (editingId) {
        await friends.updatePhone(friend.id, editingId, data);
      } else {
        await friends.addPhone(friend.id, data);
      }
    } else if (editingType === 'email' && emailFormRef) {
      const data = emailFormRef.getData();
      if (editingId) {
        await friends.updateEmail(friend.id, editingId, data);
      } else {
        await friends.addEmail(friend.id, data);
      }
    } else if (editingType === 'address' && addressFormRef) {
      const data = addressFormRef.getData();
      if (editingId) {
        await friends.updateAddress(friend.id, editingId, data);
      } else {
        await friends.addAddress(friend.id, data);
      }
    } else if (editingType === 'url' && urlFormRef) {
      const data = urlFormRef.getData();
      if (editingId) {
        await friends.updateUrl(friend.id, editingId, data);
      } else {
        await friends.addUrl(friend.id, data);
      }
    } else if (editingType === 'date' && dateFormRef) {
      const data = dateFormRef.getData();
      if (editingId) {
        await friends.updateDate(friend.id, editingId, data);
      } else {
        await friends.addDate(friend.id, data);
      }
    } else if (editingType === 'social' && socialFormRef) {
      const data = socialFormRef.getData();
      if (editingId) {
        await friends.updateSocialProfile(friend.id, editingId, data);
      } else {
        await friends.addSocialProfile(friend.id, data);
      }
    } else if (editingType === 'circle' && circleFormRef) {
      const data = circleFormRef.getData();
      // Circles only support adding, not editing
      await friends.addCircle(friend.id, data.circleId);
    } else if (editingType === 'professional' && professionalFormRef) {
      const data = professionalFormRef.getData();
      if (editingId) {
        await friends.updateProfessionalHistory(friend.id, editingId, data);
      } else {
        await friends.addProfessionalHistory(friend.id, data);
      }
    }

    closeEditModal();
  } catch (err) {
    editError = err instanceof Error ? err.message : 'Failed to save';
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
        await friends.deletePhone(friend.id, deleteId);
        break;
      case 'email':
        deletingEmailId = deleteId;
        await friends.deleteEmail(friend.id, deleteId);
        break;
      case 'address':
        deletingAddressId = deleteId;
        await friends.deleteAddress(friend.id, deleteId);
        break;
      case 'url':
        deletingUrlId = deleteId;
        await friends.deleteUrl(friend.id, deleteId);
        break;
      case 'date':
        deletingDateId = deleteId;
        await friends.deleteDate(friend.id, deleteId);
        break;
      case 'social':
        deletingSocialId = deleteId;
        await friends.deleteSocialProfile(friend.id, deleteId);
        break;
      case 'circle':
        deletingCircleId = deleteId;
        await friends.removeCircle(friend.id, deleteId);
        break;
      case 'professional':
        deletingProfessionalId = deleteId;
        await friends.deleteProfessionalHistory(friend.id, deleteId);
        break;
    }
  } finally {
    deletingPhoneId = null;
    deletingEmailId = null;
    deletingAddressId = null;
    deletingUrlId = null;
    deletingDateId = null;
    deletingSocialId = null;
    deletingCircleId = null;
    deletingProfessionalId = null;
  }
}

// Get modal title
function getModalTitle(): string {
  if (!editingType) return '';
  const action = editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add');
  const typeNames: Record<SubresourceType, string> = {
    phone: $i18n.t('friendDetail.modal.phoneNumber'),
    email: $i18n.t('friendDetail.modal.emailAddress'),
    address: $i18n.t('friendDetail.modal.address'),
    url: $i18n.t('friendDetail.modal.websiteUrl'),
    date: $i18n.t('friendDetail.modal.importantDate'),
    social: $i18n.t('friendDetail.modal.socialProfile'),
    circle: $i18n.t('friendDetail.modal.circle'),
    professional: $i18n.t('friendDetail.modal.employment'),
  };
  return `${action} ${typeNames[editingType]}`;
}

// Keyboard shortcut event listeners
onMount(() => {
  function handleAddPhone() {
    openEditModal('phone');
  }
  function handleAddEmail() {
    openEditModal('email');
  }
  function handleAddAddress() {
    openEditModal('address');
  }
  function handleAddUrl() {
    openEditModal('url');
  }
  function handleAddDate() {
    openEditModal('date');
  }
  function handleAddSocial() {
    openEditModal('social');
  }
  function handleAddCircle() {
    openEditModal('circle');
  }

  window.addEventListener('shortcut:add-phone', handleAddPhone);
  window.addEventListener('shortcut:add-email', handleAddEmail);
  window.addEventListener('shortcut:add-address', handleAddAddress);
  window.addEventListener('shortcut:add-url', handleAddUrl);
  window.addEventListener('shortcut:add-date', handleAddDate);
  window.addEventListener('shortcut:add-social', handleAddSocial);
  window.addEventListener('shortcut:add-circle', handleAddCircle);

  return () => {
    window.removeEventListener('shortcut:add-phone', handleAddPhone);
    window.removeEventListener('shortcut:add-email', handleAddEmail);
    window.removeEventListener('shortcut:add-address', handleAddAddress);
    window.removeEventListener('shortcut:add-url', handleAddUrl);
    window.removeEventListener('shortcut:add-date', handleAddDate);
    window.removeEventListener('shortcut:add-social', handleAddSocial);
    window.removeEventListener('shortcut:add-circle', handleAddCircle);
  };
});
</script>

<div class="space-y-6">
  <!-- Header with avatar and actions -->
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <FriendAvatar
      displayName={friend.displayName}
      photoUrl={friend.photoUrl}
      size="lg"
    />

    <div class="flex-1 text-center sm:text-left">
      <h1 class="text-3xl font-heading text-gray-900">{friend.displayName}</h1>

      {#if friend.namePrefix || friend.nameFirst || friend.nameMiddle || friend.nameLast || friend.nameSuffix}
        <p class="text-gray-600 font-body mt-1">
          {[friend.namePrefix, friend.nameFirst, friend.nameMiddle, friend.nameLast, friend.nameSuffix]
            .filter(Boolean)
            .join(' ')}
        </p>
      {/if}
      {#if friend.nickname}
        <p class="text-gray-500 font-body text-sm mt-1">"{friend.nickname}"</p>
      {/if}
    </div>

    <div class="flex gap-2">
      <a
        href="/friends/{friend.id}/edit"
        class="px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        {$i18n.t('common.edit')}
      </a>
      <button
        onclick={() => showDeleteConfirm = true}
        class="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-body font-semibold hover:bg-red-50 transition-colors"
      >
        {$i18n.t('common.delete')}
      </button>
    </div>
  </div>

  <!-- ==================== ABOUT SECTION ==================== -->
  {#if (friend.professionalHistory && friend.professionalHistory.length > 0) || friend.interests || friend.metInfo}
    <div class="space-y-4">
      <!-- Professional History -->
      {#if friend.professionalHistory && friend.professionalHistory.length > 0}
        <section class="space-y-2">
          <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
            <h2 class="text-lg font-heading flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {$i18n.t('friendDetail.sections.employmentHistory')}
            </h2>
            <button
              type="button"
              onclick={() => openEditModal('professional')}
              class="text-sm font-body font-semibold text-white/90 hover:text-white
                     flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {$i18n.t('friendDetail.actions.addEmployment')}
            </button>
          </div>
          <div class="space-y-2">
            {#each friend.professionalHistory as history (history.id)}
              <ProfessionalHistoryRow
                {history}
                onEdit={() => openEditModal('professional', history.id, history)}
                onDelete={() => openDeleteConfirm('professional', history.id, history.jobTitle || history.organization || 'Employment')}
                isDeleting={deletingProfessionalId === history.id}
              />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Interests -->
      {#if friend.interests}
        <section class="space-y-2">
          <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {$i18n.t('friendDetail.sections.interestsHobbies')}
          </h2>
          <div class="p-3 bg-gray-50 rounded-lg font-body text-gray-700">
            {friend.interests}
          </div>
        </section>
      {/if}

      <!-- How We Met -->
      {#if friend.metInfo}
        <section class="space-y-2">
          <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {$i18n.t('friendDetail.sections.howWeMet')}
          </h2>
          <div class="p-3 bg-gray-50 rounded-lg font-body space-y-1">
            {#if friend.metInfo.metDate || friend.metInfo.metLocation}
              <div class="text-gray-600">
                {#if friend.metInfo.metDate}
                  <span>{new Date(friend.metInfo.metDate).toLocaleDateString()}</span>
                {/if}
                {#if friend.metInfo.metDate && friend.metInfo.metLocation} at {/if}
                {#if friend.metInfo.metLocation}
                  <span>{friend.metInfo.metLocation}</span>
                {/if}
              </div>
            {/if}
            {#if friend.metInfo.metContext}
              <div class="text-gray-700">{friend.metInfo.metContext}</div>
            {/if}
          </div>
        </section>
      {/if}
    </div>
  {/if}

  <!-- ==================== CONTACT DETAILS SECTION ==================== -->
  <div class="space-y-4">
    <!-- Phone Numbers -->
    <section class="space-y-2">
      <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
        <h2 class="text-lg font-heading flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {$i18n.t('friendDetail.sections.phoneNumbers')}
        </h2>
        <button
          type="button"
          onclick={() => openEditModal('phone')}
          class="text-sm font-body font-semibold text-white/90 hover:text-white
                 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('friendDetail.actions.addPhone')}
        </button>
      </div>
      {#if friend.phones.length > 0}
        <div class="space-y-2">
          {#each friend.phones as phone (phone.id)}
            <PhoneRow
              {phone}
              onEdit={() => openEditModal('phone', phone.id, phone)}
              onDelete={() => openDeleteConfirm('phone', phone.id, phone.phoneNumber)}
              isDeleting={deletingPhoneId === phone.id}
            />
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.phones')}</p>
      {/if}
    </section>

    <!-- Email Addresses -->
    <section class="space-y-2">
      <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
        <h2 class="text-lg font-heading flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {$i18n.t('friendDetail.sections.emailAddresses')}
        </h2>
        <button
          type="button"
          onclick={() => openEditModal('email')}
          class="text-sm font-body font-semibold text-white/90 hover:text-white
                 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('friendDetail.actions.addEmail')}
        </button>
      </div>
      {#if friend.emails.length > 0}
        <div class="space-y-2">
          {#each friend.emails as email (email.id)}
            <EmailRow
              {email}
              onEdit={() => openEditModal('email', email.id, email)}
              onDelete={() => openDeleteConfirm('email', email.id, email.emailAddress)}
              isDeleting={deletingEmailId === email.id}
            />
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.emails')}</p>
      {/if}
    </section>

    <!-- Addresses -->
    <section class="space-y-2">
      <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
        <h2 class="text-lg font-heading flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {$i18n.t('friendDetail.sections.addresses')}
        </h2>
        <button
          type="button"
          onclick={() => openEditModal('address')}
          class="text-sm font-body font-semibold text-white/90 hover:text-white
                 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('friendDetail.actions.addAddress')}
        </button>
      </div>
      {#if friend.addresses.length > 0}
        <div class="space-y-2">
          {#each friend.addresses as address (address.id)}
            <AddressRow
              {address}
              onEdit={() => openEditModal('address', address.id, address)}
              onDelete={() => openDeleteConfirm('address', address.id, address.streetLine1 || address.city || 'this address')}
              isDeleting={deletingAddressId === address.id}
            />
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.addresses')}</p>
      {/if}
    </section>

    <!-- URLs -->
    <section class="space-y-2">
      <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
        <h2 class="text-lg font-heading flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {$i18n.t('friendDetail.sections.websites')}
        </h2>
        <button
          type="button"
          onclick={() => openEditModal('url')}
          class="text-sm font-body font-semibold text-white/90 hover:text-white
                 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('friendDetail.actions.addWebsite')}
        </button>
      </div>
      {#if friend.urls.length > 0}
        <div class="space-y-2">
          {#each friend.urls as url (url.id)}
            <UrlRow
              {url}
              onEdit={() => openEditModal('url', url.id, url)}
              onDelete={() => openDeleteConfirm('url', url.id, url.url)}
              isDeleting={deletingUrlId === url.id}
            />
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.websites')}</p>
      {/if}
    </section>

    <!-- Social Profiles -->
    <section class="space-y-2">
      <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
        <h2 class="text-lg font-heading flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
          </svg>
          {$i18n.t('friendDetail.sections.socialProfiles')}
        </h2>
        <button
          type="button"
          onclick={() => openEditModal('social')}
          class="text-sm font-body font-semibold text-white/90 hover:text-white
                 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('friendDetail.actions.addSocialProfile')}
        </button>
      </div>
      {#if friend.socialProfiles && friend.socialProfiles.length > 0}
        <div class="space-y-2">
          {#each friend.socialProfiles as profile (profile.id)}
            <SocialProfileRow
              {profile}
              onEdit={() => openEditModal('social', profile.id, profile)}
              onDelete={() => openDeleteConfirm('social', profile.id, profile.username || profile.profileUrl || profile.platform)}
              isDeleting={deletingSocialId === profile.id}
            />
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.socialProfiles')}</p>
      {/if}
    </section>
  </div>

  <!-- ==================== IMPORTANT DATES SECTION ==================== -->
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {$i18n.t('friendDetail.sections.importantDates')}
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('date')}
        class="text-sm font-body font-semibold text-white/90 hover:text-white
               flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {$i18n.t('friendDetail.actions.addDate')}
      </button>
    </div>
    {#if friend.dates && friend.dates.length > 0}
      <div class="space-y-2">
        {#each friend.dates as date (date.id)}
          <DateRow
            {date}
            onEdit={() => openEditModal('date', date.id, date)}
            onDelete={() => openDeleteConfirm('date', date.id, date.dateValue)}
            isDeleting={deletingDateId === date.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.dates')}</p>
    {/if}
  </section>

  <!-- ==================== CIRCLES SECTION ==================== -->
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {$i18n.t('friendDetail.sections.circles')}
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('circle')}
        class="text-sm font-body font-semibold text-white/90 hover:text-white
               flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {$i18n.t('friendDetail.actions.addCircle')}
      </button>
    </div>
    {#if friend.circles && friend.circles.length > 0}
      <div class="space-y-2">
        {#each friend.circles as circle (circle.id)}
          <CircleRow
            {circle}
            onDelete={() => openDeleteConfirm('circle', circle.id, circle.name)}
            isDeleting={deletingCircleId === circle.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">{$i18n.t('friendDetail.empty.circles')}</p>
    {/if}
  </section>

  <!-- ==================== RELATIONSHIPS SECTION ==================== -->
  <section class="space-y-2">
    <RelationshipsSection
      friendId={friend.id}
      relationships={friend.relationships ?? []}
    />
  </section>

  <!-- ==================== METADATA FOOTER ==================== -->
  <section class="text-sm text-gray-500 font-body">
    <div class="flex flex-wrap gap-4">
      <span>{$i18n.t('friendDetail.metadata.created')} {new Date(friend.createdAt).toLocaleDateString()}</span>
      <span>{$i18n.t('friendDetail.metadata.updated')} {new Date(friend.updatedAt).toLocaleDateString()}</span>
    </div>
  </section>
</div>

<!-- Delete friend confirmation modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
      <h3 class="text-xl font-heading text-gray-900 mb-2">{$i18n.t('friendDetail.delete.title')}</h3>
      <p class="text-gray-600 font-body mb-6">
        {$i18n.t('friendDetail.delete.confirmMessage')} <strong>{friend.displayName}</strong>? {$i18n.t('friendDetail.delete.cannotUndo')}
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => showDeleteConfirm = false}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {$i18n.t('common.cancel')}
        </button>
        <button
          onclick={handleDelete}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? $i18n.t('friendDetail.delete.deleting') : $i18n.t('common.delete')}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Subresource edit modal -->
{#if editingType}
  <DetailEditModal
    title={getModalTitle()}
    subtitle={friend.displayName}
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeEditModal}
  >
    {#if editingType === 'phone'}
      <PhoneEditForm
        bind:this={phoneFormRef}
        initialData={editingData as Phone | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'email'}
      <EmailEditForm
        bind:this={emailFormRef}
        initialData={editingData as Email | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'address'}
      <AddressEditForm
        bind:this={addressFormRef}
        initialData={editingData as Address | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'url'}
      <UrlEditForm
        bind:this={urlFormRef}
        initialData={editingData as Url | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'date'}
      <DateEditForm
        bind:this={dateFormRef}
        initialData={editingData as FriendDate | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'social'}
      <SocialProfileEditForm
        bind:this={socialFormRef}
        initialData={editingData as SocialProfile | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'circle'}
      <CircleEditForm
        bind:this={circleFormRef}
        existingCircles={friend.circles}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {:else if editingType === 'professional'}
      <ProfessionalHistoryEditForm
        bind:this={professionalFormRef}
        initialData={editingData as ProfessionalHistory | undefined}
        disabled={isEditLoading}
        onchange={() => isDirty = true}
      />
    {/if}
  </DetailEditModal>
{/if}

<!-- Subresource delete confirmation modal -->
{#if deleteType && deleteId}
  <DeleteConfirmModal
    title="{deleteType === 'circle' ? 'Remove from' : 'Delete'} {deleteType === 'phone' ? 'Phone Number' : deleteType === 'email' ? 'Email Address' : deleteType === 'address' ? 'Address' : deleteType === 'url' ? 'Website' : deleteType === 'date' ? 'Date' : deleteType === 'social' ? 'Social Profile' : deleteType === 'professional' ? 'Employment' : 'Circle'}"
    description={deleteType === 'circle' ? 'Are you sure you want to remove this friend from this circle?' : `Are you sure you want to delete this ${deleteType}?`}
    itemPreview={deleteName}
    onConfirm={handleSubresourceDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
