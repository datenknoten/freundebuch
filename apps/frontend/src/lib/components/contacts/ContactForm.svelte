<script lang="ts">
import { goto } from '$app/navigation';
import { contacts } from '$lib/stores/contacts';
import type {
  AddressType,
  Contact,
  DateType,
  EmailType,
  PhoneType,
  SocialPlatform,
  UrlType,
} from '$shared';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '$shared';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  contact?: Contact;
}

let { contact }: Props = $props();

const isEditing = $derived(!!contact);

// Photo state
let photoUrl = $state(contact?.photoUrl);
let photoPreview = $state<string | null>(null);
let photoFile = $state<File | null>(null);
let photoError = $state('');
let isUploadingPhoto = $state(false);
let fileInput: HTMLInputElement;

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

// Epic 1B: Professional fields
let jobTitle = $state(contact?.jobTitle ?? '');
let organization = $state(contact?.organization ?? '');
let department = $state(contact?.department ?? '');
let workNotes = $state(contact?.workNotes ?? '');
let interests = $state(contact?.interests ?? '');

// Epic 1B: Important dates (id is set for existing dates, undefined for new ones)
let dates = $state<
  Array<{
    id?: string;
    date_value: string;
    year_known: boolean;
    date_type: DateType;
    label: string;
  }>
>(
  contact?.dates?.map((d) => ({
    id: d.id,
    date_value: d.dateValue,
    year_known: d.yearKnown,
    date_type: d.dateType,
    label: d.label ?? '',
  })) ?? [],
);

// Epic 1B: How/where met
let metDate = $state(contact?.metInfo?.metDate ?? '');
let metLocation = $state(contact?.metInfo?.metLocation ?? '');
let metContext = $state(contact?.metInfo?.metContext ?? '');

// Epic 1B: Social profiles (id is set for existing profiles, undefined for new ones)
let socialProfiles = $state<
  Array<{ id?: string; platform: SocialPlatform; profile_url: string; username: string }>
>(
  contact?.socialProfiles?.map((sp) => ({
    id: sp.id,
    platform: sp.platform,
    profile_url: sp.profileUrl ?? '',
    username: sp.username ?? '',
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

// Epic 1B: Date functions
function addDate() {
  dates = [...dates, { date_value: '', year_known: true, date_type: 'birthday', label: '' }];
}

function removeDate(index: number) {
  dates = dates.filter((_, i) => i !== index);
}

// Epic 1B: Social profile functions
function addSocialProfile() {
  socialProfiles = [...socialProfiles, { platform: 'linkedin', profile_url: '', username: '' }];
}

function removeSocialProfile(index: number) {
  socialProfiles = socialProfiles.filter((_, i) => i !== index);
}

// Photo handling
function triggerPhotoUpload() {
  fileInput?.click();
}

async function handlePhotoSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  photoError = '';

  if (!file) return;

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    photoError = `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.map((t) => t.replace('image/', '')).join(', ')}`;
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    photoError = `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    return;
  }

  photoFile = file;

  // Create preview
  const reader = new FileReader();
  reader.onload = () => {
    photoPreview = reader.result as string;
  };
  reader.readAsDataURL(file);

  // If editing, upload immediately
  if (isEditing && contact) {
    await uploadPhoto();
  }
}

async function uploadPhoto() {
  if (!photoFile || !contact) return;

  isUploadingPhoto = true;
  photoError = '';

  try {
    const result = await contacts.uploadPhoto(contact.id, photoFile);
    photoUrl = result.photoUrl;
    photoPreview = null;
    photoFile = null;
  } catch (err) {
    photoError = (err as Error)?.message || 'Failed to upload photo';
  } finally {
    isUploadingPhoto = false;
  }
}

async function handleDeletePhoto() {
  if (!contact) return;

  isUploadingPhoto = true;
  photoError = '';

  try {
    await contacts.deletePhoto(contact.id);
    photoUrl = undefined;
    photoPreview = null;
    photoFile = null;
  } catch (err) {
    photoError = (err as Error)?.message || 'Failed to delete photo';
  } finally {
    isUploadingPhoto = false;
  }
}

async function handleSubmit(e: Event) {
  e.preventDefault();
  error = '';
  isLoading = true;

  try {
    const validPhones = phones.filter((p) => p.phone_number.trim());
    const validEmails = emails.filter((e) => e.email_address.trim());
    const validUrls = urls.filter((u) => u.url.trim());
    const validDates = dates.filter((d) => d.date_value.trim());
    const validSocialProfiles = socialProfiles.filter(
      (sp) => sp.profile_url.trim() || sp.username.trim(),
    );

    // Build met_info if any field is filled
    const metInfo =
      metDate || metLocation || metContext
        ? {
            met_date: metDate || undefined,
            met_location: metLocation || undefined,
            met_context: metContext || undefined,
          }
        : undefined;

    if (isEditing && contact) {
      // Update existing contact - first update basic info including Epic 1B fields
      await contacts.updateContact(contact.id, {
        display_name: displayName,
        name_prefix: namePrefix || null,
        name_first: nameFirst || null,
        name_middle: nameMiddle || null,
        name_last: nameLast || null,
        name_suffix: nameSuffix || null,
        // Epic 1B: Professional fields
        job_title: jobTitle || null,
        organization: organization || null,
        department: department || null,
        work_notes: workNotes || null,
        interests: interests || null,
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

      // Epic 1B: Handle dates - update existing, add new
      for (const date of validDates) {
        if (date.id) {
          // Update existing date
          await contacts.updateDate(contact.id, date.id, {
            date_value: date.date_value,
            year_known: date.year_known,
            date_type: date.date_type,
            label: date.label,
          });
        } else {
          // Add new date
          await contacts.addDate(contact.id, {
            date_value: date.date_value,
            year_known: date.year_known,
            date_type: date.date_type,
            label: date.label,
          });
        }
      }

      // Epic 1B: Handle met info - set if any field is filled
      if (metInfo) {
        await contacts.setMetInfo(contact.id, metInfo);
      }

      // Epic 1B: Handle social profiles - update existing, add new
      for (const profile of validSocialProfiles) {
        if (profile.id) {
          // Update existing profile
          await contacts.updateSocialProfile(contact.id, profile.id, {
            platform: profile.platform,
            profile_url: profile.profile_url || undefined,
            username: profile.username || undefined,
          });
        } else {
          // Add new profile
          await contacts.addSocialProfile(contact.id, {
            platform: profile.platform,
            profile_url: profile.profile_url || undefined,
            username: profile.username || undefined,
          });
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
        // Epic 1B: Professional fields
        job_title: jobTitle || undefined,
        organization: organization || undefined,
        department: department || undefined,
        work_notes: workNotes || undefined,
        interests: interests || undefined,
        // Sub-resources
        phones: validPhones.length > 0 ? validPhones : undefined,
        emails: validEmails.length > 0 ? validEmails : undefined,
        urls: validUrls.length > 0 ? validUrls : undefined,
        // Epic 1B: New sub-resources
        dates: validDates.length > 0 ? validDates : undefined,
        met_info: metInfo,
        social_profiles: validSocialProfiles.length > 0 ? validSocialProfiles : undefined,
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

  <!-- Avatar with photo upload -->
  <div class="flex flex-col items-center gap-3">
    <input
      type="file"
      accept={ALLOWED_MIME_TYPES.join(',')}
      class="hidden"
      bind:this={fileInput}
      onchange={handlePhotoSelect}
      disabled={isLoading || isUploadingPhoto}
    />

    <button
      type="button"
      onclick={triggerPhotoUpload}
      disabled={isLoading || isUploadingPhoto || !isEditing}
      class="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2 disabled:cursor-not-allowed"
      title={isEditing ? 'Click to upload photo' : 'Save contact first to upload photo'}
    >
      {#if photoPreview}
        <img
          src={photoPreview}
          alt="Preview"
          class="w-24 h-24 rounded-full object-cover"
        />
      {:else}
        <ContactAvatar
          displayName={displayName || 'New Contact'}
          photoUrl={photoUrl}
          size="lg"
        />
      {/if}

      {#if isUploadingPhoto}
        <div class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
        </div>
      {:else if isEditing}
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center transition-all">
          <svg
            class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      {/if}
    </button>

    {#if isEditing && photoUrl}
      <button
        type="button"
        onclick={handleDeletePhoto}
        disabled={isLoading || isUploadingPhoto}
        class="text-sm text-red-600 hover:text-red-700 font-body disabled:opacity-50"
      >
        Remove photo
      </button>
    {:else if !isEditing}
      <p class="text-xs text-gray-500 font-body">Save contact to upload photo</p>
    {:else}
      <p class="text-xs text-gray-500 font-body">Click to upload photo (max 5MB)</p>
    {/if}

    {#if photoError}
      <p class="text-sm text-red-600 font-body">{photoError}</p>
    {/if}
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

  <!-- Epic 1B: Professional Information -->
  <div class="space-y-2">
    <h3 class="text-lg font-heading text-gray-900">Professional Information</h3>
    <input
      type="text"
      bind:value={jobTitle}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Job Title"
      disabled={isLoading}
    />
    <input
      type="text"
      bind:value={organization}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Organization / Company"
      disabled={isLoading}
    />
    <input
      type="text"
      bind:value={department}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Department"
      disabled={isLoading}
    />
    <textarea
      bind:value={workNotes}
      rows="2"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none"
      placeholder="Work notes (e.g., how you know them professionally)"
      disabled={isLoading}
    ></textarea>
  </div>

  <!-- Epic 1B: Interests -->
  <div class="space-y-2">
    <h3 class="text-lg font-heading text-gray-900">Interests & Hobbies</h3>
    <textarea
      bind:value={interests}
      rows="2"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none"
      placeholder="Interests, hobbies, topics they enjoy discussing..."
      disabled={isLoading}
    ></textarea>
  </div>

  <!-- Epic 1B: Important Dates -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-heading text-gray-900">Important Dates</h3>
      <button
        type="button"
        onclick={addDate}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light"
      >
        + Add
      </button>
    </div>

    {#each dates as date, index}
      <div class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
        <div class="flex-1 space-y-1">
          <div class="flex gap-2">
            <input
              type="date"
              bind:value={date.date_value}
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
            />
            <select
              bind:value={date.date_type}
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
            >
              <option value="birthday">Birthday</option>
              <option value="anniversary">Anniversary</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="flex gap-2 items-center">
            <label class="flex items-center gap-2 text-sm text-gray-600 font-body">
              <input
                type="checkbox"
                bind:checked={date.year_known}
                class="rounded border-gray-300 text-forest focus:ring-forest"
              />
              Year known
            </label>
            {#if date.date_type === 'other'}
              <input
                type="text"
                bind:value={date.label}
                placeholder="Label (e.g., Graduation)"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
              />
            {/if}
          </div>
        </div>
        <button
          type="button"
          onclick={() => removeDate(index)}
          class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          aria-label="Remove date"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>

  <!-- Epic 1B: How/Where Met -->
  <div class="space-y-2">
    <h3 class="text-lg font-heading text-gray-900">How We Met</h3>
    <div class="flex gap-2">
      <input
        type="date"
        bind:value={metDate}
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
        disabled={isLoading}
      />
      <input
        type="text"
        bind:value={metLocation}
        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
        placeholder="Location (e.g., Conference, Coffee shop)"
        disabled={isLoading}
      />
    </div>
    <textarea
      bind:value={metContext}
      rows="2"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none"
      placeholder="Context or story of how you met..."
      disabled={isLoading}
    ></textarea>
  </div>

  <!-- Epic 1B: Social Profiles -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-heading text-gray-900">Social Profiles</h3>
      <button
        type="button"
        onclick={addSocialProfile}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light"
      >
        + Add
      </button>
    </div>

    {#each socialProfiles as profile, index}
      <div class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
        <div class="flex-1 space-y-1">
          <select
            bind:value={profile.platform}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          >
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter / X</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="github">GitHub</option>
            <option value="other">Other</option>
          </select>
          <input
            type="url"
            bind:value={profile.profile_url}
            placeholder="Profile URL"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
          <input
            type="text"
            bind:value={profile.username}
            placeholder="Username (optional if URL provided)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
          />
        </div>
        <button
          type="button"
          onclick={() => removeSocialProfile(index)}
          class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          aria-label="Remove social profile"
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
