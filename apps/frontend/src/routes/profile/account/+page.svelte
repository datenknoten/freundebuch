<script lang="ts">
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import * as authApi from '$lib/api/auth';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';

const i18n = createI18n();

let isEditing = $state(false);
let email = $state($currentUser?.email || '');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault();
  error = '';
  success = false;
  isLoading = true;

  try {
    await authApi.updateCurrentUser({ email });
    success = true;
    isEditing = false;
    isLoading = false;

    setTimeout(() => {
      success = false;
    }, 3000);
  } catch (err) {
    error = (err as Error)?.message || 'Failed to update profile';
    isLoading = false;
  }
}

function handleCancel() {
  email = $currentUser?.email || '';
  isEditing = false;
  error = '';
}
</script>

<svelte:head>
  <title>{$i18n.t('profile.hub.cards.account.title')} | Freundebuch</title>
</svelte:head>

<div class="bg-white rounded-xl shadow-lg p-8">
  <div class="mb-8">
    <a
      href="/profile"
      class="inline-flex items-center gap-2 text-gray-600 hover:text-forest font-body text-sm transition-colors"
    >
      <ChevronLeft class="w-4 h-4" strokeWidth="2" />
      {$i18n.t('profile.hub.backToProfile')}
    </a>
    <div class="flex justify-between items-start mt-4">
      <div>
        <h1 class="text-3xl font-heading text-forest">{$i18n.t('profile.hub.cards.account.title')}</h1>
        <p class="text-gray-600 font-body mt-1">{$i18n.t('profile.hub.cards.account.description')}</p>
      </div>
      {#if !isEditing}
        <button
          onclick={() => (isEditing = true)}
          class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          {$i18n.t('profile.editProfile')}
        </button>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="mb-6">
      <AlertBanner variant="error">{error}</AlertBanner>
    </div>
  {/if}

  {#if success}
    <div class="mb-6">
      <AlertBanner variant="success">{$i18n.t('profile.updateSuccess')}</AlertBanner>
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-6">
    <div>
      <label for="user-id" class="block text-sm font-body font-semibold text-gray-700 mb-2">
        {$i18n.t('profile.userId')}
      </label>
      <input
        type="text"
        id="user-id"
        value={$currentUser?.externalId || ''}
        disabled
        class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-body text-gray-600"
      />
      <p class="mt-1 text-xs font-body text-gray-500">{$i18n.t('profile.userIdHelp')}</p>
    </div>

    <div>
      <label for="email" class="block text-sm font-body font-semibold text-gray-700 mb-2">
        {$i18n.t('profile.emailAddress')}
      </label>
      <input
        type="email"
        id="email"
        bind:value={email}
        required
        disabled={!isEditing || isLoading}
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body disabled:bg-gray-100 disabled:text-gray-600"
      />
    </div>

    {#if $currentUser?.createdAt}
      <div>
        <p class="block text-sm font-body font-semibold text-gray-700 mb-2">
          {$i18n.t('profile.memberSince')}
        </p>
        <p class="font-body text-gray-600">
          {new Date($currentUser.createdAt).toLocaleDateString()}
        </p>
      </div>
    {/if}

    {#if isEditing}
      <div class="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          class="flex-1 bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? $i18n.t('profile.saving') : $i18n.t('profile.saveChanges')}
        </button>
        <button
          type="button"
          onclick={handleCancel}
          disabled={isLoading}
          class="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-body font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {$i18n.t('common.cancel')}
        </button>
      </div>
    {/if}
  </form>
</div>
