<script lang="ts">
import { goto } from '$app/navigation';
import { contacts } from '$lib/stores/contacts';
import type { AddressType, Contact, EmailType, PhoneType, UrlType } from '$shared';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  contact?: Contact;
}

let { contact }: Props = $props();

const isEditing = $derived(!!contact);

// Track if user has manually edited the display name
let displayNameManuallyEdited = $state(false);

// Form state
let displayName = $state(contact?.displayName ?? '');
let namePrefix = $state(contact?.namePrefix ?? '');
let nameFirst = $state(contact?.nameFirst ?? '');
let nameMiddle = $state(contact?.nameMiddle ?? '');
let nameLast = $state(contact?.nameLast ?? '');
let nameSuffix = $state(contact?.nameSuffix ?? '');

// Auto-generate display name from parts
function generateDisplayName(): string {
  const parts = [namePrefix, nameFirst, nameMiddle, nameLast, nameSuffix].filter(Boolean);
  return parts.join(' ').trim();
}

// Update display name when name parts change (only if not manually edited)
function updateDisplayNameFromParts() {
  if (!displayNameManuallyEdited || !displayName.trim()) {
    const generated = generateDisplayName();
    if (generated) {
      displayName = generated;
    }
  }
}

// Track manual edits to display name
function onDisplayNameInput() {
  displayNameManuallyEdited = true;
}

// Sub-resources for contact creation/editing
let phones = $state<
  Array<{ phone_number: string; phone_type: PhoneType; label: string; is_primary: boolean }>
>(
  contact?.phones.map((p) => ({
    phone_number: p.phoneNumber,
    phone_type: p.phoneType,
    label: p.label ?? '',
    is_primary: p.isPrimary,
  })) ?? [],
);
let emails = $state<
  Array<{ email_address: string; email_type: EmailType; label: string; is_primary: boolean }>
>(
  contact?.emails.map((e) => ({
    email_address: e.emailAddress,
    email_type: e.emailType,
    label: e.label ?? '',
    is_primary: e.isPrimary,
  })) ?? [],
);
let urls = $state<Array<{ url: string; url_type: UrlType; label: string }>>(
  contact?.urls.map((u) => ({
    url: u.url,
    url_type: u.urlType,
    label: u.label ?? '',
  })) ?? [],
);

let isLoading = $state(false);
let error = $state('');

// Add functions for sub-resources
function addPhone() {
  phones = [
    ...phones,
    { phone_number: '', phone_type: 'mobile', label: '', is_primary: phones.length === 0 },
  ];
}

function removePhone(index: number) {
  phones = phones.filter((_, i) => i !== index);
}

function addEmail() {
  emails = [
    ...emails,
    { email_address: '', email_type: 'personal', label: '', is_primary: emails.length === 0 },
  ];
}

function removeEmail(index: number) {
  emails = emails.filter((_, i) => i !== index);
}

function addUrl() {
  urls = [...urls, { url: '', url_type: 'personal', label: '' }];
}

function removeUrl(index: number) {
  urls = urls.filter((_, i) => i !== index);
}

async function handleSubmit(e: Event) {
  e.preventDefault();
  error = '';
  isLoading = true;

  try {
    const validPhones = phones.filter((p) => p.phone_number.trim());
    const validEmails = emails.filter((e) => e.email_address.trim());
    const validUrls = urls.filter((u) => u.url.trim());

    if (isEditing && contact) {
      // Update existing contact - first update basic info
      await contacts.updateContact(contact.id, {
        display_name: displayName,
        name_prefix: namePrefix || null,
        name_first: nameFirst || null,
        name_middle: nameMiddle || null,
        name_last: nameLast || null,
        name_suffix: nameSuffix || null,
      });

      // Handle phones - add new ones, keep existing
      const existingPhoneNumbers = new Set(contact.phones.map((p) => p.phoneNumber));
      for (const phone of validPhones) {
        if (!existingPhoneNumbers.has(phone.phone_number)) {
          await contacts.addPhone(contact.id, phone);
        }
      }

      // Handle emails - add new ones
      const existingEmailAddresses = new Set(contact.emails.map((e) => e.emailAddress));
      for (const email of validEmails) {
        if (!existingEmailAddresses.has(email.email_address)) {
          await contacts.addEmail(contact.id, email);
        }
      }

      // Handle urls - add new ones
      const existingUrls = new Set(contact.urls.map((u) => u.url));
      for (const url of validUrls) {
        if (!existingUrls.has(url.url)) {
          await contacts.addUrl(contact.id, url);
        }
      }

      goto(`/contacts/${contact.id}`);
    } else {
      // Create new contact with sub-resources
      const newContact = await contacts.createContact({
        display_name: displayName,
        name_prefix: namePrefix || undefined,
        name_first: nameFirst || undefined,
        name_middle: nameMiddle || undefined,
        name_last: nameLast || undefined,
        name_suffix: nameSuffix || undefined,
        phones: validPhones.length > 0 ? validPhones : undefined,
        emails: validEmails.length > 0 ? validEmails : undefined,
        urls: validUrls.length > 0 ? validUrls : undefined,
      });
      goto(`/contacts/${newContact.id}`);
    }
  } catch (err) {
    error = (err as Error)?.message || 'Failed to save contact';
    isLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
  {#if error}
    <div
      class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm"
      role="alert"
    >
      {error}
    </div>
  {/if}

  <!-- Avatar preview -->
  <div class="flex justify-center">
    <ContactAvatar
      displayName={displayName || 'New Contact'}
      photoUrl={contact?.photoUrl}
      size="lg"
    />
  </div>

  <!-- Name Parts -->
  <div class="space-y-2">
    <h3 class="text-lg font-heading text-gray-900">Name</h3>

    <input
      type="text"
      bind:value={namePrefix}
      oninput={updateDisplayNameFromParts}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Prefix (e.g. Dr., Mr.)"
      disabled={isLoading}
    />
    <input
      type="text"
      bind:value={nameFirst}
      oninput={updateDisplayNameFromParts}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="First Name"
      disabled={isLoading}
    />
    <input
      type="text"
      bind:value={nameMiddle}
      oninput={updateDisplayNameFromParts}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Middle Name"
      disabled={isLoading}
    />
    <input
      type="text"
      bind:value={nameLast}
      oninput={updateDisplayNameFromParts}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Last Name"
      disabled={isLoading}
    />
    <input
      type="text"
      bind:value={nameSuffix}
      oninput={updateDisplayNameFromParts}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Suffix (e.g. Jr., PhD)"
      disabled={isLoading}
    />
    <input
      type="text"
      id="displayName"
      bind:value={displayName}
      oninput={onDisplayNameInput}
      required
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Display Name *"
      disabled={isLoading}
    />
  </div>

  <!-- Phone Numbers -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-heading text-gray-900">Phone Numbers</h3>
      <button
        type="button"
        onclick={addPhone}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light"
      >
        + Add
      </button>
    </div>

    {#each phones as phone, index}
      <div class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
        <div class="flex-1 space-y-1">
          <input
            type="tel"
            bind:value={phone.phone_number}
            placeholder="Phone number"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
          <select
            bind:value={phone.phone_type}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          >
            <option value="mobile">Mobile</option>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="fax">Fax</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button
          type="button"
          onclick={() => removePhone(index)}
          class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          aria-label="Remove phone"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>

  <!-- Email Addresses -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-heading text-gray-900">Email Addresses</h3>
      <button
        type="button"
        onclick={addEmail}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light"
      >
        + Add
      </button>
    </div>

    {#each emails as email, index}
      <div class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
        <div class="flex-1 space-y-1">
          <input
            type="email"
            bind:value={email.email_address}
            placeholder="Email address"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
          <select
            bind:value={email.email_type}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          >
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button
          type="button"
          onclick={() => removeEmail(index)}
          class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          aria-label="Remove email"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>

  <!-- URLs -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-heading text-gray-900">Websites</h3>
      <button
        type="button"
        onclick={addUrl}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light"
      >
        + Add
      </button>
    </div>

    {#each urls as url, index}
      <div class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
        <div class="flex-1 space-y-1">
          <input
            type="url"
            bind:value={url.url}
            placeholder="https://example.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
          <select
            bind:value={url.url_type}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          >
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="blog">Blog</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button
          type="button"
          onclick={() => removeUrl(index)}
          class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          aria-label="Remove website"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>

  <!-- Form Actions -->
  <div class="flex gap-4 pt-4 border-t border-gray-200">
    <button
      type="submit"
      disabled={isLoading || !displayName.trim()}
      class="flex-1 bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Contact'}
    </button>

    <a
      href={isEditing && contact ? `/contacts/${contact.id}` : '/contacts'}
      class="px-6 py-3 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
    >
      Cancel
    </a>
  </div>
</form>
