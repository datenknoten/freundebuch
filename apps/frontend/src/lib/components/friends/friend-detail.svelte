<script lang="ts">
import { onMount } from 'svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import { openWithKeyboard } from '$lib/actions/auto-focus';
import { getCollectivesForFriend } from '$lib/api/friends';
import FabCreateMenu, {
  type FabCreateChoice,
  navigateForCreateChoice,
} from '$lib/components/fab-create-menu.svelte';
import Button from '$lib/components/ui/button.svelte';
import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
import MarkdownView from '$lib/editor/markdown-view.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import {
  type FriendDetailLink,
  isOpenFriendLinkModeActive,
  openFriendLinkModePrefix,
  visibleFriendDetailLinks,
} from '$lib/stores/ui';

const i18n = createI18n();

import type { ContactCollectiveSummary, Friend } from '$shared';
import LastEncounterBadge from '../encounters/last-encounter-badge.svelte';
import FriendAvatar from './friend-avatar.svelte';
import RelationshipsSection from './relationships-section.svelte';
import {
  AddressSection,
  CircleSection,
  CollectivesSection,
  DateSection,
  EmailSection,
  PhoneSection,
  ProfessionalHistorySection,
  SocialProfileSection,
  UrlSection,
} from './sections';
import { AddDetailDropdown, MobileAddDetailModal, type SubresourceType } from './subresources';

interface Props {
  friend: Friend;
}

let { friend }: Props = $props();

// Collectives state (loaded separately from friend data)
let collectives = $state<ContactCollectiveSummary[]>([]);
let collectivesLoading = $state(false);

// Load collectives on mount
$effect(() => {
  if (friend.id) {
    loadCollectives();
  }
});

async function loadCollectives() {
  collectivesLoading = true;
  try {
    collectives = await getCollectivesForFriend(friend.id);
  } catch (err) {
    console.error('Failed to load collectives:', err);
  } finally {
    collectivesLoading = false;
  }
}

// Keyboard link indices for "o" shortcut
let emailStartIndex = $derived(friend.phones.length);
let urlStartIndex = $derived(friend.phones.length + friend.emails.length);
let socialStartIndex = $derived(friend.phones.length + friend.emails.length + friend.urls.length);
let filteredSocialCount = $derived(
  friend.socialProfiles ? friend.socialProfiles.filter((p) => p.profileUrl).length : 0,
);
let collectiveStartIndex = $derived(
  friend.phones.length + friend.emails.length + friend.urls.length + filteredSocialCount,
);
let relationshipStartIndex = $derived(
  friend.phones.length +
    friend.emails.length +
    friend.urls.length +
    filteredSocialCount +
    collectives.length,
);

// Computed link list for keyboard shortcut navigation
let friendDetailLinks = $derived.by(() => {
  const links: FriendDetailLink[] = [];

  for (const phone of friend.phones) {
    links.push({ url: `tel:${phone.phoneNumber}`, type: 'protocol' });
  }
  for (const email of friend.emails) {
    links.push({ url: `mailto:${email.emailAddress}`, type: 'protocol' });
  }
  for (const url of friend.urls) {
    links.push({ url: url.url, type: 'external' });
  }
  if (friend.socialProfiles) {
    for (const profile of friend.socialProfiles) {
      if (profile.profileUrl) {
        links.push({ url: profile.profileUrl, type: 'external' });
      }
    }
  }
  for (const collective of collectives) {
    links.push({ url: `/collectives/${collective.id}`, type: 'internal' });
  }
  if (friend.relationships) {
    // Match RelationshipsSection grouping order: family → professional → social
    for (const category of ['family', 'professional', 'social'] as const) {
      for (const rel of friend.relationships.filter((r) => r.relationshipCategory === category)) {
        links.push({ url: `/friends/${rel.relatedFriendId}`, type: 'internal' });
      }
    }
  }

  return links;
});

// Sync link list to store for KeyboardShortcuts to read
$effect(() => {
  visibleFriendDetailLinks.set(friendDetailLinks);
  return () => {
    visibleFriendDetailLinks.set([]);
  };
});

// Friend deletion state (ConfirmDialog owns the in-flight and error state)
let showDeleteConfirm = $state(false);

// Mobile add modal state
let showMobileAddModal = $state(false);
let showFabCreateMenu = $state(false);

// Friend delete handler. Rejections propagate to ConfirmDialog, which keeps
// itself open and shows the reason.
async function handleDelete() {
  await friends.deleteFriend(friend.id);
  goto('/friends');
}

// Dispatch add event for desktop dropdown and mobile modal
function dispatchAddEvent(type: SubresourceType) {
  window.dispatchEvent(new CustomEvent(`shortcut:add-${type}`));
}

// Keyboard shortcut event listeners
onMount(() => {
  function handleLogEncounter() {
    goto(
      `/encounters/new?friendId=${friend.id}&friendName=${encodeURIComponent(friend.displayName)}`,
    );
  }

  function handleOpenFriendLink(e: Event) {
    const { index } = (e as CustomEvent).detail;
    const link = friendDetailLinks[index];
    if (!link) return;

    switch (link.type) {
      case 'internal':
        goto(link.url);
        break;
      case 'external':
        window.open(link.url, '_blank', 'noopener,noreferrer');
        break;
      case 'protocol':
        window.location.href = link.url;
        break;
    }
  }

  window.addEventListener('shortcut:log-encounter', handleLogEncounter);
  window.addEventListener('shortcut:open-friend-link', handleOpenFriendLink);

  return () => {
    window.removeEventListener('shortcut:log-encounter', handleLogEncounter);
    window.removeEventListener('shortcut:open-friend-link', handleOpenFriendLink);
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
        <p class="text-gray-700 font-body text-sm mt-1">"{friend.nickname}"</p>
      {/if}

      <!-- Last Encounter Badge -->
      <div class="mt-3">
        <LastEncounterBadge friendId={friend.id} friendName={friend.displayName} />
      </div>
    </div>

    <div class="flex gap-2">
      <!-- Desktop: Add dropdown (hidden on mobile) -->
      <div class="hidden sm:block">
        <AddDetailDropdown onAdd={dispatchAddEvent} />
      </div>

      <Button
        variant="secondary"
        href="/friends/{friend.id}/edit"
        data-shortcut="e"
        data-shortcut-label="shortcuts.help.editFriend"
      >
        {$i18n.t('common.edit')}
      </Button>
      <Button variant="dangerOutline" onclick={() => showDeleteConfirm = true}>
        {$i18n.t('common.delete')}
      </Button>
    </div>
  </div>

  <!-- ==================== PROFESSIONAL HISTORY SECTION ==================== -->
  <!-- Always mounted so the add-work-experience shortcut/listener is registered
       even when the friend has no employment entries yet -->
  <ProfessionalHistorySection
    friendId={friend.id}
    professionalHistory={friend.professionalHistory ?? []}
  />

  <!-- ==================== ABOUT SECTION ==================== -->
  {#if friend.interests || friend.metInfo}
    <div class="space-y-4">
      <!-- Interests -->
      {#if friend.interests}
        <section class="space-y-2">
          <h2 class="text-lg font-heading bg-forest/10 text-forest px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Heart class="w-5 h-5" strokeWidth="2" />
            {$i18n.t('friendDetail.sections.interestsHobbies')}
          </h2>
          <div class="p-3 bg-gray-50 rounded-lg">
            <MarkdownView source={friend.interests} />
          </div>
        </section>
      {/if}

      <!-- How We Met -->
      {#if friend.metInfo}
        <section class="space-y-2">
          <h2 class="text-lg font-heading bg-forest/10 text-forest px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Users class="w-5 h-5" strokeWidth="2" />
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
              <MarkdownView source={friend.metInfo.metContext} />
            {/if}
          </div>
        </section>
      {/if}
    </div>
  {/if}

  <!-- ==================== CONTACT DETAILS SECTION ==================== -->
  <div class="space-y-4">
    <PhoneSection
      friendId={friend.id}
      phones={friend.phones}
      linkStartIndex={0}
    />

    <EmailSection
      friendId={friend.id}
      emails={friend.emails}
      linkStartIndex={emailStartIndex}
    />

    <AddressSection
      friendId={friend.id}
      addresses={friend.addresses}
    />

    <UrlSection
      friendId={friend.id}
      urls={friend.urls}
      linkStartIndex={urlStartIndex}
    />

    <SocialProfileSection
      friendId={friend.id}
      socialProfiles={friend.socialProfiles ?? []}
      linkStartIndex={socialStartIndex}
    />
  </div>

  <!-- ==================== IMPORTANT DATES SECTION ==================== -->
  <DateSection
    friendId={friend.id}
    dates={friend.dates ?? []}
  />

  <!-- ==================== CIRCLES SECTION ==================== -->
  <CircleSection
    friendId={friend.id}
    circles={friend.circles ?? []}
    existingCircles={friend.circles ?? []}
  />

  <!-- ==================== COLLECTIVES SECTION ==================== -->
  <CollectivesSection
    friendId={friend.id}
    friendDisplayName={friend.displayName}
    {collectives}
    linkStartIndex={collectiveStartIndex}
    onCollectivesChanged={loadCollectives}
  />

  <!-- ==================== RELATIONSHIPS SECTION ==================== -->
  <RelationshipsSection
    friendId={friend.id}
    relationships={friend.relationships ?? []}
    linkStartIndex={relationshipStartIndex}
    existingRelationshipFriendIds={friend.relationships?.map(r => r.relatedFriendId)}
  />

  <!-- ==================== METADATA FOOTER ==================== -->
  <section class="text-sm text-gray-600 font-body">
    <div class="flex flex-wrap gap-4">
      <span>{$i18n.t('friendDetail.metadata.created')} {new Date(friend.createdAt).toLocaleDateString()}</span>
      <span>{$i18n.t('friendDetail.metadata.updated')} {new Date(friend.updatedAt).toLocaleDateString()}</span>
    </div>
  </section>
</div>

<!-- Mobile FAB: tap = merged create menu (with a contextual "add detail" entry) -->
<button
  type="button"
  onclick={() => (showFabCreateMenu = true)}
  class="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-forest text-white
         rounded-full shadow-lg hover:bg-forest-light transition-colors
         flex items-center justify-center z-(--z-fab) select-none touch-none [-webkit-touch-callout:none]"
  aria-label={$i18n.t('common.createNew')}
>
  <Plus class="w-6 h-6" strokeWidth="2" />
</button>

<!-- Mobile create menu with a contextual "add detail" entry for this friend.
     This block is kept before the add-detail modal on purpose: selecting
     "add detail" closes this menu and opens the modal in the same update.
     Svelte tears down blocks top-to-bottom, so the create menu must unmount
     (clearing isModalOpen) before the add-detail modal mounts (setting it),
     otherwise the modal would open with global shortcuts still enabled. -->
{#if showFabCreateMenu}
  <FabCreateMenu
    onSelect={(choice: FabCreateChoice) => {
      showFabCreateMenu = false;
      navigateForCreateChoice(choice);
    }}
    onAddDetail={() => {
      showFabCreateMenu = false;
      showMobileAddModal = true;
    }}
    onClose={() => (showFabCreateMenu = false)}
  />
{/if}

<!-- Mobile add detail modal -->
{#if showMobileAddModal}
  <MobileAddDetailModal
    onSelect={(type) => {
      // Close this picker and mount the edit form in one synchronous flush,
      // inside the tap, so the form's auto-focused field claims the keyboard.
      openWithKeyboard(() => {
        showMobileAddModal = false;
        dispatchAddEvent(type);
      });
    }}
    onClose={() => showMobileAddModal = false}
  />
{/if}

<!-- Delete friend confirmation -->
{#if showDeleteConfirm}
  <ConfirmDialog
    title={$i18n.t('friendDetail.delete.title')}
    description={$i18n.t('friendDetail.delete.confirmMessage')}
    itemPreview={friend.displayName}
    onConfirm={handleDelete}
    onClose={() => (showDeleteConfirm = false)}
  />
{/if}
