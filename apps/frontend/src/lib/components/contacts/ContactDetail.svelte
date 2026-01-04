<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { contacts } from '$lib/stores/contacts';
import type {
  Address,
  AddressInput,
  Contact,
  ContactDate,
  DateInput,
  Email,
  EmailInput,
  Phone,
  PhoneInput,
  SocialProfile,
  SocialProfileInput,
  Url,
  UrlInput,
} from '$shared';
import ContactAvatar from './ContactAvatar.svelte';
import RelationshipsSection from './RelationshipsSection.svelte';
import {
  AddressEditForm,
  AddressRow,
  DateEditForm,
  DateRow,
  DeleteConfirmModal,
  DetailEditModal,
  EmailEditForm,
  EmailRow,
  PhoneEditForm,
  PhoneRow,
  SocialProfileEditForm,
  SocialProfileRow,
  type SubresourceType,
  UrlEditForm,
  UrlRow,
} from './subresources';

interface Props {
  contact: Contact;
}

let { contact }: Props = $props();

// Contact deletion state
let isDeleting = $state(false);
let showDeleteConfirm = $state(false);

// Subresource editing state
let editingType = $state<SubresourceType | null>(null);
let editingId = $state<string | null>(null); // null = add new
let editingData = $state<Phone | Email | Address | Url | ContactDate | SocialProfile | null>(null);
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

// Form component references
let phoneFormRef = $state<{ getData: () => PhoneInput; isValid: () => boolean } | null>(null);
let emailFormRef = $state<{ getData: () => EmailInput; isValid: () => boolean } | null>(null);
let addressFormRef = $state<{ getData: () => AddressInput; isValid: () => boolean } | null>(null);
let urlFormRef = $state<{ getData: () => UrlInput; isValid: () => boolean } | null>(null);
let dateFormRef = $state<{ getData: () => DateInput; isValid: () => boolean } | null>(null);
let socialFormRef = $state<{ getData: () => SocialProfileInput; isValid: () => boolean } | null>(
  null,
);

// Contact delete handler
async function handleDelete() {
  isDeleting = true;
  try {
    await contacts.deleteContact(contact.id);
    goto('/contacts');
  } catch (error) {
    console.error('Failed to delete contact:', error);
    isDeleting = false;
    showDeleteConfirm = false;
  }
}

// Open edit modal
function openEditModal(
  type: SubresourceType,
  id?: string,
  data?: Phone | Email | Address | Url | ContactDate | SocialProfile,
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
        await contacts.updatePhone(contact.id, editingId, data);
      } else {
        await contacts.addPhone(contact.id, data);
      }
    } else if (editingType === 'email' && emailFormRef) {
      const data = emailFormRef.getData();
      if (editingId) {
        await contacts.updateEmail(contact.id, editingId, data);
      } else {
        await contacts.addEmail(contact.id, data);
      }
    } else if (editingType === 'address' && addressFormRef) {
      const data = addressFormRef.getData();
      if (editingId) {
        await contacts.updateAddress(contact.id, editingId, data);
      } else {
        await contacts.addAddress(contact.id, data);
      }
    } else if (editingType === 'url' && urlFormRef) {
      const data = urlFormRef.getData();
      if (editingId) {
        await contacts.updateUrl(contact.id, editingId, data);
      } else {
        await contacts.addUrl(contact.id, data);
      }
    } else if (editingType === 'date' && dateFormRef) {
      const data = dateFormRef.getData();
      if (editingId) {
        await contacts.updateDate(contact.id, editingId, data);
      } else {
        await contacts.addDate(contact.id, data);
      }
    } else if (editingType === 'social' && socialFormRef) {
      const data = socialFormRef.getData();
      if (editingId) {
        await contacts.updateSocialProfile(contact.id, editingId, data);
      } else {
        await contacts.addSocialProfile(contact.id, data);
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
        await contacts.deletePhone(contact.id, deleteId);
        break;
      case 'email':
        deletingEmailId = deleteId;
        await contacts.deleteEmail(contact.id, deleteId);
        break;
      case 'address':
        deletingAddressId = deleteId;
        await contacts.deleteAddress(contact.id, deleteId);
        break;
      case 'url':
        deletingUrlId = deleteId;
        await contacts.deleteUrl(contact.id, deleteId);
        break;
      case 'date':
        deletingDateId = deleteId;
        await contacts.deleteDate(contact.id, deleteId);
        break;
      case 'social':
        deletingSocialId = deleteId;
        await contacts.deleteSocialProfile(contact.id, deleteId);
        break;
    }
  } finally {
    deletingPhoneId = null;
    deletingEmailId = null;
    deletingAddressId = null;
    deletingUrlId = null;
    deletingDateId = null;
    deletingSocialId = null;
  }
}

// Get modal title
function getModalTitle(): string {
  if (!editingType) return '';
  const action = editingId ? 'Edit' : 'Add';
  const typeNames: Record<SubresourceType, string> = {
    phone: 'Phone Number',
    email: 'Email Address',
    address: 'Address',
    url: 'Website/URL',
    date: 'Important Date',
    social: 'Social Profile',
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

  window.addEventListener('shortcut:add-phone', handleAddPhone);
  window.addEventListener('shortcut:add-email', handleAddEmail);
  window.addEventListener('shortcut:add-address', handleAddAddress);
  window.addEventListener('shortcut:add-url', handleAddUrl);
  window.addEventListener('shortcut:add-date', handleAddDate);
  window.addEventListener('shortcut:add-social', handleAddSocial);

  return () => {
    window.removeEventListener('shortcut:add-phone', handleAddPhone);
    window.removeEventListener('shortcut:add-email', handleAddEmail);
    window.removeEventListener('shortcut:add-address', handleAddAddress);
    window.removeEventListener('shortcut:add-url', handleAddUrl);
    window.removeEventListener('shortcut:add-date', handleAddDate);
    window.removeEventListener('shortcut:add-social', handleAddSocial);
  };
});
</script>

<div class="space-y-8">
  <!-- Header with avatar and actions -->
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <ContactAvatar
      displayName={contact.displayName}
      photoUrl={contact.photoUrl}
      size="lg"
    />

    <div class="flex-1 text-center sm:text-left">
      <h1 class="text-3xl font-heading text-gray-900">{contact.displayName}</h1>

      {#if contact.namePrefix || contact.nameFirst || contact.nameMiddle || contact.nameLast || contact.nameSuffix}
        <p class="text-gray-600 font-body mt-1">
          {[contact.namePrefix, contact.nameFirst, contact.nameMiddle, contact.nameLast, contact.nameSuffix]
            .filter(Boolean)
            .join(' ')}
        </p>
      {/if}
      {#if contact.nickname}
        <p class="text-gray-500 font-body text-sm mt-1">"{contact.nickname}"</p>
      {/if}
    </div>

    <div class="flex gap-2">
      <a
        href="/contacts/{contact.id}/edit"
        class="px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        Edit
      </a>
      <button
        onclick={() => showDeleteConfirm = true}
        class="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-body font-semibold hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
    </div>
  </div>

  <!-- Phone Numbers -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Phone Numbers
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('phone')}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light
               flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Phone
      </button>
    </div>
    {#if contact.phones.length > 0}
      <div class="space-y-2">
        {#each contact.phones as phone (phone.id)}
          <PhoneRow
            {phone}
            onEdit={() => openEditModal('phone', phone.id, phone)}
            onDelete={() => openDeleteConfirm('phone', phone.id, phone.phoneNumber)}
            isDeleting={deletingPhoneId === phone.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">No phone numbers added yet.</p>
    {/if}
  </section>

  <!-- Email Addresses -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Email Addresses
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('email')}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light
               flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Email
      </button>
    </div>
    {#if contact.emails.length > 0}
      <div class="space-y-2">
        {#each contact.emails as email (email.id)}
          <EmailRow
            {email}
            onEdit={() => openEditModal('email', email.id, email)}
            onDelete={() => openDeleteConfirm('email', email.id, email.emailAddress)}
            isDeleting={deletingEmailId === email.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">No email addresses added yet.</p>
    {/if}
  </section>

  <!-- Addresses -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Addresses
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('address')}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light
               flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Address
      </button>
    </div>
    {#if contact.addresses.length > 0}
      <div class="space-y-2">
        {#each contact.addresses as address (address.id)}
          <AddressRow
            {address}
            onEdit={() => openEditModal('address', address.id, address)}
            onDelete={() => openDeleteConfirm('address', address.id, address.streetLine1 || address.city || 'this address')}
            isDeleting={deletingAddressId === address.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">No addresses added yet.</p>
    {/if}
  </section>

  <!-- URLs -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Websites
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('url')}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light
               flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Website
      </button>
    </div>
    {#if contact.urls.length > 0}
      <div class="space-y-2">
        {#each contact.urls as url (url.id)}
          <UrlRow
            {url}
            onEdit={() => openEditModal('url', url.id, url)}
            onDelete={() => openDeleteConfirm('url', url.id, url.url)}
            isDeleting={deletingUrlId === url.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">No websites added yet.</p>
    {/if}
  </section>

  <!-- Professional Information -->
  {#if contact.jobTitle || contact.organization || contact.department || contact.workNotes}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Professional
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg font-body space-y-2">
        {#if contact.jobTitle}
          <div class="font-semibold text-gray-900">{contact.jobTitle}</div>
        {/if}
        {#if contact.organization || contact.department}
          <div class="text-gray-600">
            {#if contact.organization}{contact.organization}{/if}
            {#if contact.organization && contact.department} - {/if}
            {#if contact.department}{contact.department}{/if}
          </div>
        {/if}
        {#if contact.workNotes}
          <div class="text-sm text-gray-500 italic">{contact.workNotes}</div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Interests -->
  {#if contact.interests}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        Interests & Hobbies
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg font-body text-gray-700">
        {contact.interests}
      </div>
    </section>
  {/if}

  <!-- Important Dates -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Important Dates
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('date')}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light
               flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Date
      </button>
    </div>
    {#if contact.dates && contact.dates.length > 0}
      <div class="space-y-2">
        {#each contact.dates as date (date.id)}
          <DateRow
            {date}
            onEdit={() => openEditModal('date', date.id, date)}
            onDelete={() => openDeleteConfirm('date', date.id, date.dateValue)}
            isDeleting={deletingDateId === date.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">No important dates added yet.</p>
    {/if}
  </section>

  <!-- How We Met -->
  {#if contact.metInfo}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        How We Met
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg font-body space-y-2">
        {#if contact.metInfo.metDate || contact.metInfo.metLocation}
          <div class="text-gray-600">
            {#if contact.metInfo.metDate}
              <span>{new Date(contact.metInfo.metDate).toLocaleDateString()}</span>
            {/if}
            {#if contact.metInfo.metDate && contact.metInfo.metLocation} at {/if}
            {#if contact.metInfo.metLocation}
              <span>{contact.metInfo.metLocation}</span>
            {/if}
          </div>
        {/if}
        {#if contact.metInfo.metContext}
          <div class="text-gray-700">{contact.metInfo.metContext}</div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Social Profiles -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
        Social Profiles
      </h2>
      <button
        type="button"
        onclick={() => openEditModal('social')}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light
               flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Social Profile
      </button>
    </div>
    {#if contact.socialProfiles && contact.socialProfiles.length > 0}
      <div class="space-y-2">
        {#each contact.socialProfiles as profile (profile.id)}
          <SocialProfileRow
            {profile}
            onEdit={() => openEditModal('social', profile.id, profile)}
            onDelete={() => openDeleteConfirm('social', profile.id, profile.username || profile.profileUrl || profile.platform)}
            isDeleting={deletingSocialId === profile.id}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 font-body">No social profiles added yet.</p>
    {/if}
  </section>

  <!-- Relationships -->
  <section class="space-y-3">
    <RelationshipsSection
      contactId={contact.id}
      relationships={contact.relationships ?? []}
    />
  </section>

  <!-- Metadata -->
  <section class="pt-6 border-t border-gray-200 text-sm text-gray-500 font-body">
    <div class="flex flex-wrap gap-4">
      <span>Created: {new Date(contact.createdAt).toLocaleDateString()}</span>
      <span>Updated: {new Date(contact.updatedAt).toLocaleDateString()}</span>
    </div>
  </section>
</div>

<!-- Delete contact confirmation modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
      <h3 class="text-xl font-heading text-gray-900 mb-2">Delete Contact</h3>
      <p class="text-gray-600 font-body mb-6">
        Are you sure you want to delete <strong>{contact.displayName}</strong>? This action cannot be undone.
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => showDeleteConfirm = false}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onclick={handleDelete}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Subresource edit modal -->
{#if editingType}
  <DetailEditModal
    title={getModalTitle()}
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
        initialData={editingData as ContactDate | undefined}
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
    {/if}
  </DetailEditModal>
{/if}

<!-- Subresource delete confirmation modal -->
{#if deleteType && deleteId}
  <DeleteConfirmModal
    title="Delete {deleteType === 'phone' ? 'Phone Number' : deleteType === 'email' ? 'Email Address' : deleteType === 'address' ? 'Address' : deleteType === 'url' ? 'Website' : deleteType === 'date' ? 'Date' : 'Social Profile'}"
    description="Are you sure you want to delete this {deleteType}?"
    itemPreview={deleteName}
    onConfirm={handleSubresourceDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
