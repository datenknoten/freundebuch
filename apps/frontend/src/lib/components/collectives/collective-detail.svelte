<script lang="ts">
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Home from 'svelte-heros-v2/Home.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import { openWithKeyboard } from '$lib/actions/auto-focus';
import FabCreateMenu, {
  type FabCreateChoice,
  navigateForCreateChoice,
} from '$lib/components/fab-create-menu.svelte';
import { Button, ConfirmDialog } from '$lib/components/ui';
import MarkdownView from '$lib/editor/markdown-view.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { collectives } from '$lib/stores/collectives';
import { collectiveTypeI18nKey } from '$lib/utils/collective-types';
import type { Collective } from '$shared';
import SubresourceSection from '../subresources/subresource-section.svelte';
import AddDetailDropdown from './add-detail-dropdown.svelte';
import MemberSection from './member-section.svelte';
import MobileAddDetailModal from './mobile-add-detail-modal.svelte';
import { circleDescriptor, contactDescriptors } from './subresource-descriptors';

const i18n = createI18n();

interface Props {
  collective: Collective;
  onEdit?: () => void;
}

let { collective, onEdit }: Props = $props();

// Collective deletion (ConfirmDialog owns the in-flight and error state)
let showDeleteConfirm = $state(false);

// Mobile FAB / add-detail state
let showFabCreateMenu = $state(false);
let showMobileAddModal = $state(false);

// Open a sub-resource's add modal. Each SubresourceSection (and MemberSection)
// listens for its own window event, so dispatching it works even when the
// section is currently hidden because it has no items yet.
function dispatchAddEvent(shortcutEvent: string) {
  window.dispatchEvent(new CustomEvent(shortcutEvent));
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

// Rejections propagate to ConfirmDialog, which keeps itself open and shows the
// reason; on success it closes itself and we navigate away.
async function handleDelete() {
  await collectives.deleteCollective(collective.id);
  goto('/collectives');
}

let address = $derived(formatAddress(collective));
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
          {$i18n.t(collectiveTypeI18nKey(collective.type.name), { defaultValue: collective.type.name })}
        </span>
        <span class="text-sm text-gray-500 font-body">
          {$i18n.t('collectives.memberCount', { count: collective.activeMemberCount })}
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
      <!-- Desktop: Add detail dropdown (hidden on mobile; mobile uses the FAB) -->
      <div class="hidden sm:block">
        <AddDetailDropdown onAdd={dispatchAddEvent} />
      </div>

      <Button
        variant="secondary"
        onclick={() => onEdit?.()}
        data-shortcut="e"
        data-shortcut-label="shortcuts.help.editCollective"
      >
        {$i18n.t('common.edit')}
      </Button>
      <Button variant="dangerOutline" onclick={() => (showDeleteConfirm = true)}>
        {$i18n.t('common.delete')}
      </Button>
    </div>
  </div>

  <!-- ==================== NOTES SECTION ==================== -->
  {#if collective.notes}
    <section class="space-y-2">
      <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
        <DocumentText class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('collectives.detail.notes')}
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg">
        <MarkdownView source={collective.notes} />
      </div>
    </section>
  {/if}

  <!-- ==================== CONTACT DETAILS SECTION ==================== -->
  <div class="space-y-4">
    {#each contactDescriptors as descriptor (descriptor.key)}
      <SubresourceSection {descriptor} ownerId={collective.id} ownerName={collective.name} />
    {/each}
  </div>

  <!-- ==================== CIRCLES SECTION ==================== -->
  <SubresourceSection
    descriptor={circleDescriptor}
    ownerId={collective.id}
    ownerName={collective.name}
  />

  <!-- ==================== MEMBERS SECTION ==================== -->
  <MemberSection {collective} />

  <!-- ==================== METADATA FOOTER ==================== -->
  <section class="text-sm text-gray-500 font-body">
    <div class="flex flex-wrap gap-4">
      <span>{$i18n.t('collectives.detail.created')} {new Date(collective.createdAt).toLocaleDateString()}</span>
      <span>{$i18n.t('collectives.detail.lastUpdated')} {new Date(collective.updatedAt).toLocaleDateString()}</span>
    </div>
  </section>
</div>

<!-- Delete collective confirmation -->
{#if showDeleteConfirm}
  <ConfirmDialog
    title={$i18n.t('collectives.detail.deleteConfirmTitle')}
    description={$i18n.t('collectives.detail.deleteConfirmMessage')}
    itemPreview={collective.name}
    onConfirm={handleDelete}
    onClose={() => (showDeleteConfirm = false)}
  />
{/if}

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

<!-- Mobile create menu with a contextual "add detail" entry for this collective.
     Keep this block before the add-detail modal: selecting "add detail" closes
     this menu and opens the modal in the same update, and Svelte tears down
     blocks top-to-bottom, so the create menu must unmount (clearing
     isModalOpen) before the modal mounts (setting it). -->
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
    onSelect={(shortcutEvent) => {
      // Close this picker and mount the edit form in one synchronous flush,
      // inside the tap, so the form's auto-focused field claims the keyboard.
      openWithKeyboard(() => {
        showMobileAddModal = false;
        dispatchAddEvent(shortcutEvent);
      });
    }}
    onClose={() => (showMobileAddModal = false)}
  />
{/if}
