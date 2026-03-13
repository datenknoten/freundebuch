<script lang="ts">
import { onMount } from 'svelte';
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/AlertBanner.svelte';
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

async function handleDelete(id: string) {
  deletingId = id;
  error = '';
  try {
    const result = await authClient.passkey.deletePasskey({ id });
    if (result?.error) {
      error = result.error.message || $i18n.t('profile.passkeys.failedToDelete');
    } else {
      await loadPasskeys();
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.passkeys.failedToDelete');
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

  <button
    onclick={handleAdd}
    disabled={isAdding}
    class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isAdding ? $i18n.t('profile.passkeys.registering') : $i18n.t('profile.passkeys.add')}
  </button>

  {#if isLoading}
    <div class="text-center py-4">
      <p class="text-gray-500 font-body">{$i18n.t('profile.passkeys.loading')}</p>
    </div>
  {:else if passkeys.length === 0}
    <div class="text-center py-8 bg-gray-50 rounded-lg">
      <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
      <p class="text-gray-600 font-body">{$i18n.t('profile.passkeys.noPasskeys')}</p>
      <p class="text-gray-500 font-body text-sm mt-1">{$i18n.t('profile.passkeys.noPasskeysHint')}</p>
    </div>
  {:else}
    <div class="divide-y divide-gray-200 border border-gray-200 rounded-lg">
      {#each passkeys as pk (pk.id)}
        <div class="flex items-center justify-between p-4">
          <div class="flex-1">
            {#if editingId === pk.id}
              <form
                onsubmit={(e) => { e.preventDefault(); saveEdit(pk.id); }}
                class="flex items-center gap-2"
              >
                <input
                  type="text"
                  bind:value={editName}
                  placeholder={$i18n.t('profile.passkeys.namePlaceholder')}
                  class="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
                />
                <button
                  type="submit"
                  class="text-forest hover:text-forest-light font-body text-sm font-medium"
                >
                  {$i18n.t('common.save')}
                </button>
                <button
                  type="button"
                  onclick={cancelEdit}
                  class="text-gray-500 hover:text-gray-700 font-body text-sm"
                >
                  {$i18n.t('common.cancel')}
                </button>
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
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
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
            <button
              onclick={() => handleDelete(pk.id)}
              disabled={deletingId === pk.id}
              class="text-red-600 hover:text-red-800 font-body text-sm font-medium disabled:opacity-50"
            >
              {deletingId === pk.id ? $i18n.t('profile.passkeys.deleting') : $i18n.t('common.delete')}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
