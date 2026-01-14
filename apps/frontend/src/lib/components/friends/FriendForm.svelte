<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import { friends } from '$lib/stores/friends';
import type { Friend, FriendCreateInput } from '$shared';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '$shared';
import FriendAvatar from './FriendAvatar.svelte';
import ImageCropModal from './ImageCropModal.svelte';

interface Props {
  friend?: Friend;
  /** Onboarding mode - for creating the user's self-friend */
  isOnboarding?: boolean;
  /** Custom submit handler (used in onboarding mode) */
  onSubmit?: (data: FriendCreateInput) => Promise<void>;
  /** Custom submit button label */
  submitLabel?: string;
  /** External loading state (used in onboarding mode) */
  isLoading?: boolean;
}

let {
  friend,
  isOnboarding = false,
  onSubmit: onSubmitProp,
  submitLabel,
  isLoading: externalIsLoading,
}: Props = $props();

const isEditing = $derived(!!friend && !isOnboarding);

// Photo state - initialize with functions to capture initial values
let photoUrl = $state((() => friend?.photoUrl)());
let photoPreview = $state<string | null>(null);
let photoFile = $state<File | null>(null);
let photoError = $state('');
let isUploadingPhoto = $state(false);
let fileInput: HTMLInputElement;
let firstNameInput: HTMLInputElement;

// Crop modal state
let showCropModal = $state(false);
let cropImageUrl = $state<string | null>(null);

// Track if user has manually edited the display name
let displayNameManuallyEdited = $state(false);

// Form state - initialize with functions to capture initial values
let displayName = $state((() => friend?.displayName ?? '')());
let nickname = $state((() => friend?.nickname ?? '')());
let namePrefix = $state((() => friend?.namePrefix ?? '')());
let nameFirst = $state((() => friend?.nameFirst ?? '')());
let nameMiddle = $state((() => friend?.nameMiddle ?? '')());
let nameLast = $state((() => friend?.nameLast ?? '')());
let nameSuffix = $state((() => friend?.nameSuffix ?? '')());

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

// Epic 1B: Professional fields - initialize with functions to capture initial values
let jobTitle = $state((() => friend?.jobTitle ?? '')());
let organization = $state((() => friend?.organization ?? '')());
let department = $state((() => friend?.department ?? '')());
let workNotes = $state((() => friend?.workNotes ?? '')());
let interests = $state((() => friend?.interests ?? '')());

// Epic 1B: How/where met - initialize with functions to capture initial values
let metDate = $state((() => friend?.metInfo?.metDate ?? '')());
let metLocation = $state((() => friend?.metInfo?.metLocation ?? '')());
let metContext = $state((() => friend?.metInfo?.metContext ?? '')());

let internalIsLoading = $state(false);
const isLoading = $derived(externalIsLoading ?? internalIsLoading);
let error = $state('');

// Focus firstname input when form opens
// Use requestAnimationFrame to ensure the browser has completed layout
// before focusing, which is required for mobile keyboards to open reliably
onMount(() => {
  requestAnimationFrame(() => {
    firstNameInput?.focus();
  });
});

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

  // Create data URL for crop modal
  const reader = new FileReader();
  reader.onload = () => {
    cropImageUrl = reader.result as string;
    showCropModal = true;
  };
  reader.readAsDataURL(file);

  // Reset file input so the same file can be selected again
  input.value = '';
}

async function handleCropComplete(croppedBlob: Blob) {
  showCropModal = false;
  cropImageUrl = null;

  // Create a File from the Blob
  const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
  photoFile = croppedFile;

  // Create preview from cropped blob
  photoPreview = URL.createObjectURL(croppedBlob);

  // If editing, upload immediately
  if (isEditing && friend) {
    await uploadPhoto();
  }
}

function handleCropCancel() {
  showCropModal = false;
  cropImageUrl = null;
}

async function uploadPhoto() {
  if (!photoFile || !friend) return;

  isUploadingPhoto = true;
  photoError = '';

  try {
    const result = await friends.uploadPhoto(friend.id, photoFile);
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
  if (!friend) return;

  isUploadingPhoto = true;
  photoError = '';

  try {
    await friends.deletePhoto(friend.id);
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
  internalIsLoading = true;

  try {
    // Build met_info if any field is filled
    const metInfo =
      metDate || metLocation || metContext
        ? {
            met_date: metDate || undefined,
            met_location: metLocation || undefined,
            met_context: metContext || undefined,
          }
        : undefined;

    // Build the friend data for creating/onboarding
    const friendData: FriendCreateInput = {
      display_name: displayName,
      nickname: nickname || undefined,
      name_prefix: namePrefix || undefined,
      name_first: nameFirst || undefined,
      name_middle: nameMiddle || undefined,
      name_last: nameLast || undefined,
      name_suffix: nameSuffix || undefined,
      job_title: jobTitle || undefined,
      organization: organization || undefined,
      department: department || undefined,
      work_notes: workNotes || undefined,
      interests: interests || undefined,
      met_info: metInfo,
    };

    // Onboarding mode - call the custom submit handler
    if (isOnboarding && onSubmitProp) {
      await onSubmitProp(friendData);
      return; // Parent handles navigation
    }

    if (isEditing && friend) {
      // Update existing friend - core fields only
      // Subresources (phones, emails, etc.) are edited inline on the detail page
      await friends.updateFriend(friend.id, {
        display_name: displayName,
        nickname: nickname || null,
        name_prefix: namePrefix || null,
        name_first: nameFirst || null,
        name_middle: nameMiddle || null,
        name_last: nameLast || null,
        name_suffix: nameSuffix || null,
        job_title: jobTitle || null,
        organization: organization || null,
        department: department || null,
        work_notes: workNotes || null,
        interests: interests || null,
      });

      // Handle met info - set if any field is filled
      if (metInfo) {
        await friends.setMetInfo(friend.id, metInfo);
      }

      goto(`/friends/${friend.id}`);
    } else {
      // Create new friend - core fields only
      // Subresources can be added inline on the detail page after creation
      const newFriend = await friends.createFriend(friendData);
      goto(`/friends/${newFriend.id}`);
    }
  } catch (err) {
    error = (err as Error)?.message || 'Failed to save friend';
    internalIsLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
  {#if error}
    <AlertBanner variant="error">{error}</AlertBanner>
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
      title={isEditing ? 'Click to upload photo' : 'Save friend first to upload photo'}
    >
      {#if photoPreview}
        <img
          src={photoPreview}
          alt="Preview"
          class="w-24 h-24 rounded-full object-cover"
        />
      {:else}
        <FriendAvatar
          displayName={displayName || 'New Friend'}
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
      <p class="text-xs text-gray-500 font-body">Save friend to upload photo</p>
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
      bind:this={firstNameInput}
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
    <input
      type="text"
      bind:value={nickname}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
      placeholder="Nickname"
      disabled={isLoading}
    />
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

  <!-- Form Actions -->
  <div class="flex gap-4 pt-4 border-t border-gray-200">
    <button
      type="submit"
      disabled={isLoading || !displayName.trim()}
      class="flex-1 bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isLoading}
        Saving...
      {:else if submitLabel}
        {submitLabel}
      {:else if isEditing}
        Save Changes
      {:else}
        Create Friend
      {/if}
    </button>

    {#if !isOnboarding}
      <a
        href={isEditing && friend ? `/friends/${friend.id}` : '/friends'}
        class="px-6 py-3 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
      >
        Cancel
      </a>
    {/if}
  </div>
</form>

<!-- Image Crop Modal -->
{#if showCropModal && cropImageUrl}
  <ImageCropModal
    imageUrl={cropImageUrl}
    onCrop={handleCropComplete}
    onClose={handleCropCancel}
  />
{/if}
