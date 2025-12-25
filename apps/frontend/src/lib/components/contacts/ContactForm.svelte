<script lang="ts">
import { goto } from '$app/navigation';
import type { Contact, PhoneType, EmailType, AddressType, UrlType } from '$shared';
import { contacts } from '$lib/stores/contacts';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  contact?: Contact;
}

let { contact }: Props = $props();

const isEditing = $derived(!!contact);

// Form state
let displayName = $state(contact?.displayName ?? '');
let namePrefix = $state(contact?.namePrefix ?? '');
let nameFirst = $state(contact?.nameFirst ?? '');
let nameMiddle = $state(contact?.nameMiddle ?? '');
let nameLast = $state(contact?.nameLast ?? '');
let nameSuffix = $state(contact?.nameSuffix ?? '');

// Sub-resources for new contact creation
let phones = $state<Array<{ phone_number: string; phone_type: PhoneType; label: string; is_primary: boolean }>>([]);
let emails = $state<Array<{ email_address: string; email_type: EmailType; label: string; is_primary: boolean }>>([]);
let addresses = $state<Array<{
  street_line1: string;
  street_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  address_type: AddressType;
  label: string;
  is_primary: boolean;
}>>([]);
let urls = $state<Array<{ url: string; url_type: UrlType; label: string }>>([]);

let isLoading = $state(false);
let error = $state('');

// Add functions for sub-resources
function addPhone() {
  phones = [...phones, { phone_number: '', phone_type: 'mobile', label: '', is_primary: phones.length === 0 }];
}

function removePhone(index: number) {
  phones = phones.filter((_, i) => i !== index);
}

function addEmail() {
  emails = [...emails, { email_address: '', email_type: 'personal', label: '', is_primary: emails.length === 0 }];
}

function removeEmail(index: number) {
  emails = emails.filter((_, i) => i !== index);
}

function addAddress() {
  addresses = [...addresses, {
    street_line1: '',
    street_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    address_type: 'home',
    label: '',
    is_primary: addresses.length === 0,
  }];
}

function removeAddress(index: number) {
  addresses = addresses.filter((_, i) => i !== index);
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
    if (isEditing && contact) {
      // Update existing contact
      await contacts.updateContact(contact.id, {
        display_name: displayName,
        name_prefix: namePrefix || null,
        name_first: nameFirst || null,
        name_middle: nameMiddle || null,
        name_last: nameLast || null,
        name_suffix: nameSuffix || null,
      });
      goto(`/contacts/${contact.id}`);
    } else {
      // Create new contact with sub-resources
      const validPhones = phones.filter(p => p.phone_number.trim());
      const validEmails = emails.filter(e => e.email_address.trim());
      const validAddresses = addresses.filter(a => a.street_line1.trim() || a.city.trim());
      const validUrls = urls.filter(u => u.url.trim());

      const newContact = await contacts.createContact({
        display_name: displayName,
        name_prefix: namePrefix || undefined,
        name_first: nameFirst || undefined,
        name_middle: nameMiddle || undefined,
        name_last: nameLast || undefined,
        name_suffix: nameSuffix || undefined,
        phones: validPhones.length > 0 ? validPhones : undefined,
        emails: validEmails.length > 0 ? validEmails : undefined,
        addresses: validAddresses.length > 0 ? validAddresses : undefined,
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

<form onsubmit={handleSubmit} class="space-y-8">
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

  <!-- Display Name (required) -->
  <div>
    <label for="displayName" class="block text-sm font-body font-semibold text-gray-700 mb-2">
      Display Name <span class="text-red-500">*</span>
    </label>
    <input
      type="text"
      id="displayName"
      bind:value={displayName}
      required
      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
      placeholder="John Doe"
      disabled={isLoading}
    />
  </div>

  <!-- Name Parts (optional) -->
  <div class="space-y-4">
    <h3 class="text-lg font-heading text-gray-900">Name Parts (Optional)</h3>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label for="namePrefix" class="block text-sm font-body font-semibold text-gray-700 mb-2">
          Prefix
        </label>
        <input
          type="text"
          id="namePrefix"
          bind:value={namePrefix}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
          placeholder="Dr."
          disabled={isLoading}
        />
      </div>

      <div>
        <label for="nameFirst" class="block text-sm font-body font-semibold text-gray-700 mb-2">
          First Name
        </label>
        <input
          type="text"
          id="nameFirst"
          bind:value={nameFirst}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
          placeholder="John"
          disabled={isLoading}
        />
      </div>

      <div>
        <label for="nameMiddle" class="block text-sm font-body font-semibold text-gray-700 mb-2">
          Middle Name
        </label>
        <input
          type="text"
          id="nameMiddle"
          bind:value={nameMiddle}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
          placeholder="M."
          disabled={isLoading}
        />
      </div>

      <div>
        <label for="nameLast" class="block text-sm font-body font-semibold text-gray-700 mb-2">
          Last Name
        </label>
        <input
          type="text"
          id="nameLast"
          bind:value={nameLast}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
          placeholder="Doe"
          disabled={isLoading}
        />
      </div>

      <div>
        <label for="nameSuffix" class="block text-sm font-body font-semibold text-gray-700 mb-2">
          Suffix
        </label>
        <input
          type="text"
          id="nameSuffix"
          bind:value={nameSuffix}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
          placeholder="Jr."
          disabled={isLoading}
        />
      </div>
    </div>
  </div>

  <!-- Phone Numbers (only for new contacts) -->
  {#if !isEditing}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-heading text-gray-900">Phone Numbers</h3>
        <button
          type="button"
          onclick={addPhone}
          class="text-sm text-forest font-body font-semibold hover:text-forest-light"
        >
          + Add Phone
        </button>
      </div>

      {#each phones as phone, index}
        <div class="flex gap-2 items-start p-4 bg-gray-50 rounded-lg">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
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
            <input
              type="text"
              bind:value={phone.label}
              placeholder="Label (optional)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
            />
          </div>
          <button
            type="button"
            onclick={() => removePhone(index)}
            class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>

    <!-- Email Addresses -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-heading text-gray-900">Email Addresses</h3>
        <button
          type="button"
          onclick={addEmail}
          class="text-sm text-forest font-body font-semibold hover:text-forest-light"
        >
          + Add Email
        </button>
      </div>

      {#each emails as email, index}
        <div class="flex gap-2 items-start p-4 bg-gray-50 rounded-lg">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
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
            <input
              type="text"
              bind:value={email.label}
              placeholder="Label (optional)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
            />
          </div>
          <button
            type="button"
            onclick={() => removeEmail(index)}
            class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>

    <!-- URLs -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-heading text-gray-900">Websites</h3>
        <button
          type="button"
          onclick={addUrl}
          class="text-sm text-forest font-body font-semibold hover:text-forest-light"
        >
          + Add Website
        </button>
      </div>

      {#each urls as url, index}
        <div class="flex gap-2 items-start p-4 bg-gray-50 rounded-lg">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
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
            <input
              type="text"
              bind:value={url.label}
              placeholder="Label (optional)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
            />
          </div>
          <button
            type="button"
            onclick={() => removeUrl(index)}
            class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Form Actions -->
  <div class="flex gap-4 pt-4 border-t border-gray-200">
    <button
      type="submit"
      disabled={isLoading || !displayName.trim()}
      class="flex-1 bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Contact')}
    </button>

    <a
      href={isEditing && contact ? `/contacts/${contact.id}` : '/contacts'}
      class="px-6 py-3 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
    >
      Cancel
    </a>
  </div>
</form>
