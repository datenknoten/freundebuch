<script lang="ts">
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Home from 'svelte-heros-v2/Home.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import { collectives } from '$lib/stores/collectives';
import { isModalOpen } from '$lib/stores/ui';
import { collectiveTypeI18nKey } from '$lib/utils/collective-types';
import type { Collective } from '$shared';
import MemberSection from './member-section.svelte';
import { circleDescriptor, contactDescriptors } from './subresource-descriptors';
import SubresourceSection from './subresource-section.svelte';

const i18n = createI18n();

interface Props {
  collective: Collective;
  onEdit?: () => void;
}

let { collective, onEdit }: Props = $props();

// Collective deletion
let isDeleting = $state(false);
let showDeleteConfirm = $state(false);

function openDeleteConfirm() {
  showDeleteConfirm = true;
  isModalOpen.set(true);
}

function closeDeleteConfirm() {
  showDeleteConfirm = false;
  isModalOpen.set(false);
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

async function handleDelete() {
  isDeleting = true;
  try {
    await collectives.deleteCollective(collective.id);
    // Clear the modal flag before navigating; goto() may not unmount us
    // (or could fail), which would otherwise leave shortcuts suppressed.
    closeDeleteConfirm();
    goto('/collectives');
  } catch (err) {
    console.error('Failed to delete collective:', err);
    closeDeleteConfirm();
  } finally {
    // Reset independently of navigation: if goto() fails or doesn't unmount
    // us, the UI must not stay stuck in a permanently-deleting state.
    isDeleting = false;
  }
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
      <button
        type="button"
        onclick={() => onEdit?.()}
        class="px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        data-shortcut="e"
        data-shortcut-label="shortcuts.help.editCollective"
      >
        {$i18n.t('common.edit')}
      </button>
      <button
        onclick={openDeleteConfirm}
        class="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-body font-semibold hover:bg-red-50 transition-colors"
      >
        {$i18n.t('common.delete')}
      </button>
    </div>
  </div>

  <!-- ==================== NOTES SECTION ==================== -->
  {#if collective.notes}
    <section class="space-y-2">
      <h2 class="text-lg font-heading bg-forest text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
        <DocumentText class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('collectives.detail.notes')}
      </h2>
      <div class="p-3 bg-gray-50 rounded-lg font-body text-gray-700 whitespace-pre-wrap">
        {collective.notes}
      </div>
    </section>
  {/if}

  <!-- ==================== CONTACT DETAILS SECTION ==================== -->
  <div class="space-y-4">
    {#each contactDescriptors as descriptor (descriptor.key)}
      <SubresourceSection {descriptor} collectiveId={collective.id} collectiveName={collective.name} />
    {/each}
  </div>

  <!-- ==================== CIRCLES SECTION ==================== -->
  <SubresourceSection descriptor={circleDescriptor} collectiveId={collective.id} collectiveName={collective.name} />

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
  <div class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
      <h3 class="text-xl font-heading text-gray-900 mb-2">{$i18n.t('collectives.detail.deleteConfirmTitle')}</h3>
      <p class="text-gray-600 font-body mb-6">
        {$i18n.t('collectives.detail.deleteConfirmMessage', { name: collective.name })}
      </p>
      <div class="flex gap-3">
        <button
          onclick={closeDeleteConfirm}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {$i18n.t('collectives.form.cancel')}
        </button>
        <button
          onclick={handleDelete}
          disabled={isDeleting}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? $i18n.t('collectives.detail.deleting') : $i18n.t('collectives.detail.delete')}
        </button>
      </div>
    </div>
  </div>
{/if}
