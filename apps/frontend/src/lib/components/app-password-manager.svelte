<script lang="ts">
import { onMount } from 'svelte';
import Key from 'svelte-heros-v2/Key.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import type { AppPassword, CreateAppPasswordResult } from '$lib/api/app-passwords';
import * as appPasswordsApi from '$lib/api/app-passwords';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { createI18n, getCurrentLanguage } from '$lib/i18n/index.js';

const i18n = createI18n();

let passwords = $state<AppPassword[]>([]);
let isLoading = $state(true);
let error = $state('');
let newPasswordName = $state('');
let isCreating = $state(false);
let createdPassword = $state<CreateAppPasswordResult | null>(null);
let revokingId = $state<string | null>(null);

onMount(async () => {
  await loadPasswords();
});

async function loadPasswords() {
  isLoading = true;
  error = '';
  try {
    passwords = await appPasswordsApi.listAppPasswords();
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.appPasswords.failedToLoad');
  } finally {
    isLoading = false;
  }
}

async function handleCreate(event: SubmitEvent) {
  event.preventDefault();
  if (newPasswordName.trim().length === 0) return;

  isCreating = true;
  error = '';
  try {
    createdPassword = await appPasswordsApi.createAppPassword(newPasswordName.trim());
    newPasswordName = '';
    await loadPasswords();
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.appPasswords.failedToCreate');
  } finally {
    isCreating = false;
  }
}

async function handleRevoke(id: string) {
  revokingId = id;
  error = '';
  try {
    await appPasswordsApi.revokeAppPassword(id);
    await loadPasswords();
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.appPasswords.failedToRevoke');
  } finally {
    revokingId = null;
  }
}

function dismissCreatedPassword() {
  createdPassword = null;
}

function formatDate(dateString: string | null): string {
  if (dateString === null) return $i18n.t('profile.appPasswords.never');
  return new Date(dateString).toLocaleDateString(getCurrentLanguage(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<div class="space-y-6">
  {#if error}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  {#if createdPassword}
    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex justify-between items-start mb-2">
        <h4 class="font-body font-semibold text-green-800">{$i18n.t('profile.appPasswords.created')}</h4>
        <button
          onclick={dismissCreatedPassword}
          class="text-green-600 hover:text-green-800"
          aria-label={$i18n.t('profile.appPasswords.dismiss')}
        >
          <XMark class="w-5 h-5" strokeWidth="2" />
        </button>
      </div>
      <p class="font-body text-sm text-green-700 mb-3">
        {$i18n.t('profile.appPasswords.copyNow')}
      </p>
      <div class="bg-white border border-green-300 rounded px-3 py-2 font-mono text-lg select-all">
        {createdPassword.password}
      </div>
      <p class="font-body text-xs text-green-600 mt-2">
        {$i18n.t('profile.appPasswords.useWith')}
      </p>
    </div>
  {/if}

  <form onsubmit={handleCreate} class="flex gap-2">
    <input
      type="text"
      bind:value={newPasswordName}
      placeholder={$i18n.t('profile.appPasswords.namePlaceholder')}
      disabled={isCreating}
      class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body disabled:bg-gray-100"
    />
    <button
      type="submit"
      disabled={isCreating || newPasswordName.trim().length === 0}
      class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isCreating ? $i18n.t('profile.appPasswords.creating') : $i18n.t('profile.appPasswords.create')}
    </button>
  </form>

  {#if isLoading}
    <div class="text-center py-4">
      <p class="text-gray-500 font-body">{$i18n.t('profile.appPasswords.loading')}</p>
    </div>
  {:else if passwords.length === 0}
    <div class="text-center py-8 bg-gray-50 rounded-lg">
      <Key class="w-12 h-12 mx-auto text-gray-400 mb-3" strokeWidth="2" />
      <p class="text-gray-600 font-body">{$i18n.t('profile.appPasswords.noPasswords')}</p>
      <p class="text-gray-500 font-body text-sm mt-1">{$i18n.t('profile.appPasswords.noPasswordsSubtitle')}</p>
    </div>
  {:else}
    <div class="divide-y divide-gray-200 border border-gray-200 rounded-lg">
      {#each passwords as password (password.externalId)}
        <div class="flex items-center justify-between p-4">
          <div class="flex-1">
            <span class="font-body font-semibold text-gray-800">{password.name}</span>
            <div class="text-sm font-body text-gray-500 mt-1">
              {$i18n.t('profile.appPasswords.createdAt', { date: formatDate(password.createdAt) })}
              {#if password.lastUsedAt !== null}
                <span class="mx-1">&middot;</span>
                {$i18n.t('profile.appPasswords.lastUsed', { date: formatDate(password.lastUsedAt) })}
              {/if}
            </div>
          </div>
          <button
            onclick={() => handleRevoke(password.externalId)}
            disabled={revokingId === password.externalId}
            class="text-red-600 hover:text-red-800 font-body text-sm font-medium disabled:opacity-50"
          >
            {revokingId === password.externalId
              ? $i18n.t('profile.appPasswords.revoking')
              : $i18n.t('profile.appPasswords.revoke')}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
