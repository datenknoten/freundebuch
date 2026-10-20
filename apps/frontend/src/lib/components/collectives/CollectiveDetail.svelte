<script lang="ts">
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { goto } from '$app/navigation';
import { openWithKeyboard } from '$lib/actions/auto-focus';
import { getAppContext } from '$lib/app-context.js';
import MemberSection from '$lib/components/collectives/MemberSection.svelte';
import FabCreateMenu, {
  type FabCreateChoice,
  navigateForCreateChoice,
} from '$lib/components/FabCreateMenu.svelte';
import AddDetailDropdown from '$lib/components/subresources/AddDetailDropdown.svelte';
import AddDetailSheet from '$lib/components/subresources/AddDetailSheet.svelte';
import SubresourceSection from '$lib/components/subresources/SubresourceSection.svelte';
import Button from '$lib/components/ui/Button.svelte';
import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
import { CHIP_CLASSES } from '$lib/components/ui/chip-classes.js';
import Fab from '$lib/components/ui/Fab.svelte';
import { HEADING_CLASSES } from '$lib/components/ui/heading-classes.js';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import MarkdownView from '$lib/editor/MarkdownView.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import {
  collectiveTypeI18nKey,
  getTypeBadgeColor,
  getTypeIconComponent,
} from '$lib/utils/collective-types';
import { type CollectiveResponse, countryDisplayName } from '$shared';
import { createCollectiveDescriptors } from './subresource-descriptors.js';

const currentLanguage = getAppContext().stores.locale.currentLanguage;

const i18n = createI18n();
const { api, stores } = getAppContext();
const collectives = stores.collectives;
const {
  contactDescriptors,
  circleDescriptor,
  addDetailOptions: collectiveAddDetailOptions,
} = createCollectiveDescriptors({
  collectivesApi: api.collectives,
  collectiveContactsApi: api.collectiveContacts,
});

interface Props {
  collective: CollectiveResponse;
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

function isFilled(part: string | null): part is string {
  return part !== null && part !== '';
}

function formatAddress(c: CollectiveResponse, language: string) {
  const parts = [
    c.address.streetLine1,
    c.address.streetLine2,
    [c.address.postalCode, c.address.city].filter(isFilled).join(' '),
    c.address.stateProvince,
    c.address.country === null ? null : countryDisplayName(c.address.country, language),
  ].filter(isFilled);
  return parts.length > 0 ? parts.join(', ') : null;
}

// Rejections propagate to ConfirmDialog, which keeps itself open and shows the
// reason; on success it closes itself and we navigate away.
async function handleDelete() {
  await collectives.deleteCollective(collective.id);
  void goto('/collectives');
}

let address = $derived(formatAddress(collective, $currentLanguage));
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
      <h1 class={HEADING_CLASSES.entity}>{collective.name}</h1>
      <div class="mt-1 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span class="{CHIP_CLASSES.base} {typeBadgeColor}">
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
      <h2 class="{SURFACE_CLASSES.sectionHeading} {HEADING_CLASSES.section}">
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
