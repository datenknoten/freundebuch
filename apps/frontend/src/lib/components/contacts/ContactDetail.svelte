<script lang="ts">
import { goto } from '$app/navigation';
import { contacts } from '$lib/stores/contacts';
import type { Contact } from '$shared';
import ContactAvatar from './ContactAvatar.svelte';
import RelationshipsSection from './RelationshipsSection.svelte';

interface Props {
  contact: Contact;
}

let { contact }: Props = $props();

let isDeleting = $state(false);
let showDeleteConfirm = $state(false);

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

function formatPhoneType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatAddressType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDateType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatPlatform(platform: string): string {
  const platformNames: Record<string, string> = {
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X',
    facebook: 'Facebook',
    instagram: 'Instagram',
    github: 'GitHub',
    other: 'Other',
  };
  return platformNames[platform] ?? platform;
}

function formatDate(dateStr: string, yearKnown: boolean): string {
  const date = new Date(dateStr);
  if (yearKnown) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
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
  {#if contact.phones.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Phone Numbers
      </h2>
      <div class="space-y-2">
        {#each contact.phones as phone}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <a
                href="tel:{phone.phoneNumber}"
                class="text-forest font-body font-semibold hover:text-forest-light"
              >
                {phone.phoneNumber}
              </a>
              <span class="text-sm text-gray-500 ml-2">
                {formatPhoneType(phone.phoneType)}
                {#if phone.label} - {phone.label}{/if}
                {#if phone.isPrimary}
                  <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
                {/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Email Addresses -->
  {#if contact.emails.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Email Addresses
      </h2>
      <div class="space-y-2">
        {#each contact.emails as email}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <a
                href="mailto:{email.emailAddress}"
                class="text-forest font-body font-semibold hover:text-forest-light"
              >
                {email.emailAddress}
              </a>
              <span class="text-sm text-gray-500 ml-2">
                {formatPhoneType(email.emailType)}
                {#if email.label} - {email.label}{/if}
                {#if email.isPrimary}
                  <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
                {/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Addresses -->
  {#if contact.addresses.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Addresses
      </h2>
      <div class="space-y-2">
        {#each contact.addresses as address}
          <div class="p-3 bg-gray-50 rounded-lg">
            <div class="flex items-start justify-between">
              <div class="font-body">
                {#if address.streetLine1}
                  <div>{address.streetLine1}</div>
                {/if}
                {#if address.streetLine2}
                  <div>{address.streetLine2}</div>
                {/if}
                <div>
                  {[address.city, address.stateProvince, address.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {#if address.country}
                  <div>{address.country}</div>
                {/if}
              </div>
              <span class="text-sm text-gray-500">
                {formatAddressType(address.addressType)}
                {#if address.label} - {address.label}{/if}
                {#if address.isPrimary}
                  <span class="ml-1 px-2 py-0.5 bg-forest text-white text-xs rounded">Primary</span>
                {/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- URLs -->
  {#if contact.urls.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Websites
      </h2>
      <div class="space-y-2">
        {#each contact.urls as url}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-forest font-body font-semibold hover:text-forest-light"
              >
                {url.url}
              </a>
              <span class="text-sm text-gray-500 ml-2">
                {formatPhoneType(url.urlType)}
                {#if url.label} - {url.label}{/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Epic 1B: Professional Information -->
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

  <!-- Epic 1B: Interests -->
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

  <!-- Epic 1B: Important Dates -->
  {#if contact.dates && contact.dates.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Important Dates
      </h2>
      <div class="space-y-2">
        {#each contact.dates as date}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="font-body">
              <span class="font-semibold text-gray-900">
                {formatDate(date.dateValue, date.yearKnown)}
              </span>
              <span class="text-sm text-gray-500 ml-2">
                {formatDateType(date.dateType)}
                {#if date.label} - {date.label}{/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Epic 1B: How We Met -->
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

  <!-- Epic 1B: Social Profiles -->
  {#if contact.socialProfiles && contact.socialProfiles.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-heading text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
        Social Profiles
      </h2>
      <div class="space-y-2">
        {#each contact.socialProfiles as profile}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              {#if profile.profileUrl}
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-forest font-body font-semibold hover:text-forest-light"
                >
                  {profile.username || profile.profileUrl}
                </a>
              {:else}
                <span class="font-body font-semibold text-gray-900">
                  @{profile.username}
                </span>
              {/if}
              <span class="text-sm text-gray-500 ml-2">
                {formatPlatform(profile.platform)}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Epic 1D: Relationships -->
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

<!-- Delete confirmation modal -->
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
