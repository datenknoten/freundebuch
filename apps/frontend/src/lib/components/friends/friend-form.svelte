<script lang="ts">
import { untrack } from 'svelte';
import Camera from 'svelte-heros-v2/Camera.svelte';
import { goto } from '$app/navigation';
import * as collectivesApi from '$lib/api/collectives.js';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { Button, FormInput, headingClasses, Spinner } from '$lib/components/ui';
import MarkdownEditor from '$lib/editor/markdown-editor.svelte';
import MarkdownField from '$lib/editor/markdown-field.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { Friend, FriendCreateInput } from '$shared';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '$shared';
import FriendAvatar from './friend-avatar.svelte';
import ImageCropModal from './image-crop-modal.svelte';

const i18n = createI18n();

// The interests editor is labelled by its visible section heading.
const interestsLabelId = $props.id();

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
  /** When set, the new friend is added to this collective after creation */
  addToCollective?: { id: string; roleId?: string };
}

let {
  friend,
  isOnboarding = false,
  onSubmit: onSubmitProp,
  submitLabel,
  isLoading: externalIsLoading,
  addToCollective,
}: Props = $props();

const isEditing = $derived(!!friend && !isOnboarding);

// Photo state - initialize with functions to capture initial values
let photoUrl = $state((() => friend?.photoUrl)());
let photoPreview = $state<string | null>(null);
let photoFile = $state<File | null>(null);
let photoError = $state('');
let isUploadingPhoto = $state(false);
let fileInput: HTMLInputElement;

// Crop modal state
let showCropModal = $state(false);
let cropImageUrl = $state<string | null>(null);

// Form state - initialize with functions to capture initial values
let displayName = $state((() => friend?.displayName ?? '')());
// The avatar derives initials from this string, so it must stay a string even
// during SSR, where i18next has not been initialised and `t()` yields nothing.
const avatarName = $derived(
  displayName.length > 0 ? displayName : ($i18n.t('friends.newFriend') ?? ''),
);
let nickname = $state((() => friend?.nickname ?? '')());
let namePrefix = $state((() => friend?.namePrefix ?? '')());
let nameFirst = $state((() => friend?.nameFirst ?? '')());
let nameMiddle = $state((() => friend?.nameMiddle ?? '')());
let nameLast = $state((() => friend?.nameLast ?? '')());
let nameSuffix = $state((() => friend?.nameSuffix ?? '')());
let maidenName = $state((() => friend?.maidenName ?? '')());

// The display name mirrors the name parts until the user types their own.
// `lastAutoDisplayName` records what the sync last wrote, so a display name
// that no longer matches it is a manual edit and the sync steps back.
const generatedDisplayName = $derived(
  [namePrefix, nameFirst, nameMiddle, nameLast, nameSuffix]
    .filter((part) => part.length > 0)
    .join(' ')
    .trim(),
);

let lastAutoDisplayName = (() => friend?.displayName ?? '')();
let displayNameSyncPrimed = false;

$effect(() => {
  const generated = generatedDisplayName;
  untrack(() => {
    // The first run only primes the baseline: an existing friend keeps the
    // display name it was saved with, however its name parts read.
    if (!displayNameSyncPrimed) {
      displayNameSyncPrimed = true;
      return;
    }
    if (generated.length === 0) return;
    if (displayName !== lastAutoDisplayName && displayName.trim().length > 0) return;
    displayName = generated;
    lastAutoDisplayName = generated;
  });
});

// Epic 1B: Interests field - initialize with function to capture initial value
// Note: Professional information (job, org, dept) is now managed in the Professional History subresource
let interests = $state((() => friend?.interests ?? '')());

// Epic 1B: How/where met - initialize with functions to capture initial values
let metDate = $state((() => friend?.metInfo?.metDate ?? '')());
let metLocation = $state((() => friend?.metInfo?.metLocation ?? '')());
let metContext = $state((() => friend?.metInfo?.metContext ?? '')());

let internalIsLoading = $state(false);
const isLoading = $derived(externalIsLoading ?? internalIsLoading);
let error = $state('');

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
    photoError = $i18n.t('friendForm.photo.invalidType', {
      types: ALLOWED_MIME_TYPES.map((t) => t.replace('image/', '')).join(', '),
    });
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    photoError = $i18n.t('friendForm.photo.tooLarge', { size: MAX_FILE_SIZE / 1024 / 1024 });
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
    photoError = (err as Error)?.message || $i18n.t('friendForm.photo.uploadError');
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
    photoError = (err as Error)?.message || $i18n.t('friendForm.photo.deleteError');
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
    // Note: Professional history is now managed as a subresource from the detail page
    const friendData: FriendCreateInput = {
      display_name: displayName,
      nickname: nickname || undefined,
      name_prefix: namePrefix || undefined,
      name_first: nameFirst || undefined,
      name_middle: nameMiddle || undefined,
      name_last: nameLast || undefined,
      name_suffix: nameSuffix || undefined,
      maiden_name: maidenName || undefined,
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
      // Subresources (phones, emails, professional history, etc.) are edited inline on the detail page
      await friends.updateFriend(friend.id, {
        display_name: displayName,
        nickname: nickname || null,
        name_prefix: namePrefix || null,
        name_first: nameFirst || null,
        name_middle: nameMiddle || null,
        name_last: nameLast || null,
        name_suffix: nameSuffix || null,
        maiden_name: maidenName || null,
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

      if (addToCollective) {
        // Add the new friend to the collective, then return there
        try {
          let roleId = addToCollective.roleId;
          if (!roleId) {
            // Fall back to the collective type's default (first) role
            const collective = await collectivesApi.getCollective(addToCollective.id);
            roleId = collective.type.roles.toSorted((a, b) => a.sortOrder - b.sortOrder)[0]?.id;
          }
          if (roleId) {
            await collectivesApi.addMember(addToCollective.id, {
              friend_id: newFriend.id,
              role_id: roleId,
            });
            // Only return to the collective once the friend is actually a member
            goto(`/collectives/${addToCollective.id}`);
            return;
          }
          // No role could be resolved (e.g. collective has no roles); the friend
          // was created but not added, so fall through to the friend detail page
        } catch (err) {
          // Friend was created; membership failed - land on the friend so nothing is lost
          console.error('Failed to add new friend to collective:', err);
        }
      }

      goto(`/friends/${newFriend.id}`);
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('friendForm.saveError');
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
      title={isEditing
        ? $i18n.t('friendForm.photo.uploadTitle')
        : $i18n.t('friendForm.photo.saveFirstTitle')}
    >
      {#if photoPreview}
        <img
          src={photoPreview}
          alt={$i18n.t('friendForm.photo.previewAlt')}
          class="w-24 h-24 rounded-full object-cover"
        />
      {:else}
        <FriendAvatar displayName={avatarName} photoUrl={photoUrl} size="lg" />
      {/if}

      {#if isUploadingPhoto}
        <div class="absolute inset-0 bg-gray-900/50 rounded-full flex items-center justify-center">
          <Spinner tone="white" />
        </div>
      {:else if isEditing}
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full flex items-center justify-center transition-all">
          <Camera class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth="2" />
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
        {$i18n.t('friendForm.photo.remove')}
      </button>
    {:else if !isEditing}
      <p class="text-xs text-gray-500 font-body">{$i18n.t('friendForm.photo.saveFirstHint')}</p>
    {:else}
      <p class="text-xs text-gray-500 font-body">{$i18n.t('friendForm.photo.uploadHint')}</p>
    {/if}

    {#if photoError}
      <p class="text-sm text-red-600 font-body">{photoError}</p>
    {/if}
  </div>

  <!-- Name parts -->
  <div class="space-y-4">
    <h3 class={headingClasses.sub}>{$i18n.t('friendForm.nameHeading')}</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormInput
        id="namePrefix"
        label={$i18n.t('friendForm.prefix')}
        bind:value={namePrefix}
        placeholder={$i18n.t('friendForm.prefixPlaceholder')}
        disabled={isLoading}
      />
      <FormInput
        id="nameFirst"
        label={$i18n.t('friendForm.firstName')}
        bind:value={nameFirst}
        disabled={isLoading}
        autofocus
      />
      <FormInput
        id="nameMiddle"
        label={$i18n.t('friendForm.middleName')}
        bind:value={nameMiddle}
        disabled={isLoading}
      />
      <FormInput
        id="nameLast"
        label={$i18n.t('friendForm.lastName')}
        bind:value={nameLast}
        disabled={isLoading}
      />
      <FormInput
        id="nameSuffix"
        label={$i18n.t('friendForm.suffix')}
        bind:value={nameSuffix}
        placeholder={$i18n.t('friendForm.suffixPlaceholder')}
        disabled={isLoading}
      />
      <FormInput
        id="maidenName"
        label={$i18n.t('friendForm.maidenName')}
        bind:value={maidenName}
        disabled={isLoading}
      />
    </div>

    <FormInput
      id="displayName"
      label={$i18n.t('friendForm.displayName')}
      bind:value={displayName}
      required
      helper={$i18n.t('friendForm.displayNameHelper')}
      disabled={isLoading}
    />
    <FormInput
      id="nickname"
      label={$i18n.t('friendForm.nickname')}
      bind:value={nickname}
      disabled={isLoading}
    />
  </div>

  <!-- Epic 1B: Interests -->
  <div class="space-y-2">
    <h3 id={interestsLabelId} class={headingClasses.sub}>
      {$i18n.t('friendDetail.sections.interestsHobbies')}
    </h3>
    <MarkdownEditor
      bind:value={interests}
      labelledBy={interestsLabelId}
      placeholder={$i18n.t('friendForm.interestsPlaceholder')}
      disabled={isLoading}
    />
  </div>

  <!-- Epic 1B: How/Where Met -->
  <div class="space-y-4">
    <h3 class={headingClasses.sub}>{$i18n.t('friendDetail.sections.howWeMet')}</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormInput
        id="metDate"
        type="date"
        label={$i18n.t('friendForm.metDate')}
        bind:value={metDate}
        disabled={isLoading}
      />
      <FormInput
        id="metLocation"
        label={$i18n.t('friendForm.metLocation')}
        bind:value={metLocation}
        placeholder={$i18n.t('friendForm.metLocationPlaceholder')}
        disabled={isLoading}
      />
    </div>
    <MarkdownField
      bind:value={metContext}
      label={$i18n.t('friendForm.metContext')}
      placeholder={$i18n.t('friendForm.metContextPlaceholder')}
      disabled={isLoading}
    />
  </div>

  <!-- Form actions -->
  <div
    class="sticky bottom-0 bg-white border-t border-gray-200 py-4 -mx-8 px-8 flex gap-3 justify-end"
  >
    {#if !isOnboarding}
      <Button
        variant="secondary"
        href={isEditing && friend
          ? `/friends/${friend.id}`
          : addToCollective
            ? `/collectives/${addToCollective.id}`
            : '/friends'}
      >
        {$i18n.t('common.cancel')}
      </Button>
    {/if}

    <Button type="submit" loading={isLoading} disabled={displayName.trim().length === 0}>
      {#if submitLabel !== undefined && submitLabel.length > 0}
        {submitLabel}
      {:else if isEditing}
        {$i18n.t('friendForm.saveChanges')}
      {:else}
        {$i18n.t('friendForm.create')}
      {/if}
    </Button>
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
