<script lang="ts">
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { goto } from '$app/navigation';
import { openWithKeyboard } from '$lib/actions/auto-focus';
import FabCreateMenu, {
  type FabCreateChoice,
  navigateForCreateChoice,
} from '$lib/components/fab-create-menu.svelte';
import {
  Button,
  ConfirmDialog,
  chipClasses,
  Fab,
  headingClasses,
  surfaceClasses,
} from '$lib/components/ui';
import MarkdownView from '$lib/editor/markdown-view.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { collectives } from '$lib/stores/collectives';
import {
  collectiveTypeI18nKey,
  getTypeBadgeColor,
  getTypeIconComponent,
} from '$lib/utils/collective-types';
import type { Collective } from '$shared';
import AddDetailDropdown from '../subresources/add-detail-dropdown.svelte';
import AddDetailSheet from '../subresources/add-detail-sheet.svelte';
import SubresourceSection from '../subresources/subresource-section.svelte';
import MemberSection from './member-section.svelte';
import {
  circleDescriptor,
  collectiveAddDetailOptions,
  contactDescriptors,
} from './subresource-descriptors';

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
let TypeIcon = $derived(getTypeIconComponent(collective.type.name));
let typeBadgeColor = $derived(getTypeBadgeColor(collective.type.name));
</script>

<div class="space-y-6">
  <!-- Header with type icon and actions -->
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <!-- Type icon as avatar -->
    <div class="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center {typeBadgeColor}">
      <TypeIcon class="w-10 h-10" strokeWidth="2" />
    </div>

    <div class="flex-1 text-center sm:text-left">
      <h1 class={headingClasses.entity}>{collective.name}</h1>
      <div class="mt-1 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span class="{chipClasses.base} {typeBadgeColor}">
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
        <AddDetailDropdown options={collectiveAddDetailOptions} onAdd={dispatchAddEvent} />
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
      <h2 class="{surfaceClasses.section} {headingClasses.section} gap-2">
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
<Fab onclick={() => (showFabCreateMenu = true)} label={$i18n.t('common.createNew')}>
  <Plus class="w-6 h-6" strokeWidth="2" />
</Fab>

<!-- Mobile create menu with a contextual "add detail" entry for this collective. -->
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
  <AddDetailSheet
    options={collectiveAddDetailOptions}
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
