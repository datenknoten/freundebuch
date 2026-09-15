<script lang="ts">
import { onMount } from 'svelte';
import Key from 'svelte-heros-v2/Key.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import type { AppPassword, CreateAppPasswordResult } from '$lib/api/app-passwords';
import * as appPasswordsApi from '$lib/api/app-passwords';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { codeClasses, FormInput } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';
import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
import EmptyState from '$lib/components/ui/empty-state.svelte';
import Spinner from '$lib/components/ui/spinner.svelte';
import { createI18n, getCurrentLanguage } from '$lib/i18n/index.js';

const i18n = createI18n();

let passwords = $state<AppPassword[]>([]);
let isLoading = $state(true);
let error = $state('');
let newPasswordName = $state('');
let isCreating = $state(false);
let createdPassword = $state<CreateAppPasswordResult | null>(null);
let revokingId = $state<string | null>(null);
let revokeConfirmId = $state<string | null>(null);
let revokeConfirmName = $state('');

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

function openRevokeConfirm(password: AppPassword) {
  revokeConfirmId = password.externalId;
  revokeConfirmName = password.name;
}

function closeRevokeConfirm() {
  revokeConfirmId = null;
  revokeConfirmName = '';
}

// Rejections stay inside ConfirmDialog, which keeps itself open and shows the
// reason, so the failure is visible where the action was taken.
async function handleRevoke() {
  const id = revokeConfirmId;
  if (id === null) return;
  revokingId = id;
  error = '';
  try {
    await appPasswordsApi.revokeAppPassword(id);
    await loadPasswords();
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
  {#if error.length > 0}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  {#if createdPassword !== null}
    <AlertBanner variant="success">
      <div class="flex justify-between items-start mb-2">
        <p class="font-semibold">{$i18n.t('profile.appPasswords.created')}</p>
        <button
          onclick={dismissCreatedPassword}
          class="text-green-600 hover:text-green-800"
          aria-label={$i18n.t('profile.appPasswords.dismiss')}
        >
          <XMark class="w-5 h-5" strokeWidth="2" />
        </button>
      </div>
      <p class="mb-3">
        {$i18n.t('profile.appPasswords.copyNow')}
      </p>
      <code class="block {codeClasses.blockLg} select-all">
        {createdPassword.password}
      </code>
      <p class="text-xs mt-2">
        {$i18n.t('profile.appPasswords.useWith')}
      </p>
    </AlertBanner>
  {/if}

  <form onsubmit={handleCreate} class="flex items-end gap-2">
    <div class="flex-1">
      <FormInput
        id="app-password-name"
        label={$i18n.t('profile.appPasswords.nameLabel')}
        bind:value={newPasswordName}
        placeholder={$i18n.t('profile.appPasswords.namePlaceholder')}
        disabled={isCreating}
      />
    </div>
    <Button type="submit" loading={isCreating} disabled={newPasswordName.trim().length === 0}>
      {$i18n.t('profile.appPasswords.create')}
    </Button>
  </form>

  {#if isLoading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" label={$i18n.t('profile.appPasswords.loading')} />
    </div>
  {:else if passwords.length === 0}
    <EmptyState icon={Key} title={$i18n.t('profile.appPasswords.noPasswords')} description={$i18n.t('profile.appPasswords.noPasswordsSubtitle')} />
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
          <Button
            variant="dangerOutline"
            size="sm"
            onclick={() => openRevokeConfirm(password)}
            disabled={revokingId === password.externalId}
          >
            {$i18n.t('profile.appPasswords.revoke')}
          </Button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if revokeConfirmId !== null}
  <ConfirmDialog
    title={$i18n.t('profile.appPasswords.revokeTitle')}
    description={$i18n.t('profile.appPasswords.revokeDescription')}
    itemPreview={revokeConfirmName}
    confirmLabel={$i18n.t('profile.appPasswords.revoke')}
    onConfirm={handleRevoke}
    onClose={closeRevokeConfirm}
  />
{/if}
