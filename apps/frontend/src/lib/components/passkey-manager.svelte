<script lang="ts">
import { onMount } from 'svelte';
import Key from 'svelte-heros-v2/Key.svelte';
import PencilSquare from 'svelte-heros-v2/PencilSquare.svelte';
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { FormInput } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';
import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
import EmptyState from '$lib/components/ui/empty-state.svelte';
import Spinner from '$lib/components/ui/spinner.svelte';
import { createI18n, getCurrentLanguage } from '$lib/i18n/index.js';

const i18n = createI18n();

interface Passkey {
  id: string;
  name?: string;
  publicKey: string;
  userId: string;
  credentialID: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports?: string;
  createdAt: Date;
  aaguid?: string;
}

let passkeys = $state<Passkey[]>([]);
let isLoading = $state(true);
let error = $state('');
let isAdding = $state(false);
let deletingId = $state<string | null>(null);
let editingId = $state<string | null>(null);
let editName = $state('');
let deleteConfirmId = $state<string | null>(null);
let deleteConfirmName = $state('');

onMount(async () => {
  await loadPasskeys();
});

async function loadPasskeys() {
  isLoading = true;
  error = '';
  try {
    const result = await authClient.passkey.listUserPasskeys();
    passkeys = (result?.data ?? []) as Passkey[];
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.passkeys.failedToLoad');
  } finally {
    isLoading = false;
  }
}

async function handleAdd() {
  isAdding = true;
  error = '';
  try {
    const result = await authClient.passkey.addPasskey();
    if (result?.error) {
      error = result.error.message || $i18n.t('profile.passkeys.failedToRegister');
    } else {
      await loadPasskeys();
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.passkeys.failedToRegister');
  } finally {
    isAdding = false;
  }
}

function openDeleteConfirm(pk: Passkey) {
  deleteConfirmId = pk.id;
  deleteConfirmName = pk.name || $i18n.t('profile.passkeys.unnamedPasskey');
}

function closeDeleteConfirm() {
  deleteConfirmId = null;
  deleteConfirmName = '';
}

// Rejections stay inside ConfirmDialog, which keeps itself open and shows the
// reason, so the failure is visible where the action was taken.
async function handleDelete() {
  const id = deleteConfirmId;
  if (id === null) return;
  deletingId = id;
  error = '';
  try {
    const result = await authClient.passkey.deletePasskey({ id });
    if (result?.error) {
      throw new Error(result.error.message || $i18n.t('profile.passkeys.failedToDelete'));
    }
    await loadPasskeys();
  } finally {
    deletingId = null;
  }
}

function startEditing(pk: Passkey) {
  editingId = pk.id;
  editName = pk.name || '';
}

async function saveEdit(id: string) {
  error = '';
  try {
    const result = await authClient.passkey.updatePasskey({
      id,
      name: editName.trim() || $i18n.t('profile.passkeys.unnamedPasskey'),
    });
    if (result?.error) {
      error = result.error.message || $i18n.t('profile.passkeys.failedToRename');
    } else {
      editingId = null;
      await loadPasskeys();
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.passkeys.failedToRename');
  }
}

function cancelEdit() {
  editingId = null;
  editName = '';
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(getCurrentLanguage(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function deviceTypeLabel(type: string | null): string {
  if (type === 'multiDevice') return $i18n.t('profile.passkeys.deviceType.multiDevice');
  if (type === 'singleDevice') return $i18n.t('profile.passkeys.deviceType.singleDevice');
  return $i18n.t('profile.passkeys.deviceType.unknown');
}
</script>

<div class="space-y-6">
  {#if error}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  <Button loading={isAdding} onclick={handleAdd}>
    {$i18n.t('profile.passkeys.add')}
  </Button>

  {#if isLoading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" label={$i18n.t('profile.passkeys.loading')} />
    </div>
  {:else if passkeys.length === 0}
    <EmptyState icon={Key} title={$i18n.t('profile.passkeys.noPasskeys')} description={$i18n.t('profile.passkeys.noPasskeysHint')} />
  {:else}
    <div class="divide-y divide-gray-200 border border-gray-200 rounded-lg">
      {#each passkeys as pk (pk.id)}
        <div class="flex items-center justify-between p-4">
          <div class="flex-1">
            {#if editingId === pk.id}
              <form
                onsubmit={(e) => { e.preventDefault(); saveEdit(pk.id); }}
                class="flex items-end gap-2"
              >
                <div class="flex-1">
                  <FormInput
                    id="passkey-name-{pk.id}"
                    label={$i18n.t('profile.passkeys.nameLabel')}
                    bind:value={editName}
                    placeholder={$i18n.t('profile.passkeys.namePlaceholder')}
                    size="sm"
                  />
                </div>
                <Button type="submit" variant="ghostAccent" size="sm">
                  {$i18n.t('common.save')}
                </Button>
                <Button variant="ghost" size="sm" onclick={cancelEdit}>
                  {$i18n.t('common.cancel')}
                </Button>
              </form>
            {:else}
              <div class="flex items-center gap-2">
                <span class="font-body font-semibold text-gray-800">
                  {pk.name || $i18n.t('profile.passkeys.unnamedPasskey')}
                </span>
                <button
                  onclick={() => startEditing(pk)}
                  class="text-gray-400 hover:text-gray-600"
                  aria-label={$i18n.t('profile.passkeys.renameAria')}
                >
                  <PencilSquare class="w-4 h-4" strokeWidth="2" />
                </button>
              </div>
              <div class="text-sm font-body text-gray-500 mt-1">
                {deviceTypeLabel(pk.deviceType)}
                <span class="mx-1">&middot;</span>
                {$i18n.t('profile.passkeys.added', { date: formatDate(pk.createdAt) })}
              </div>
            {/if}
          </div>
          {#if editingId !== pk.id}
            <Button
              variant="dangerOutline"
              size="sm"
              onclick={() => openDeleteConfirm(pk)}
              disabled={deletingId === pk.id}
            >
              {$i18n.t('common.delete')}
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if deleteConfirmId !== null}
  <ConfirmDialog
    title={$i18n.t('profile.passkeys.deleteTitle')}
    description={$i18n.t('profile.passkeys.deleteDescription')}
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
