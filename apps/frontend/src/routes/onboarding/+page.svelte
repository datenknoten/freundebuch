<script lang="ts">
import { goto } from '$app/navigation';
import type { FriendCreateData } from '$lib/api/friend-create-data.js';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import FriendForm from '$lib/components/friends/FriendForm.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const { api, stores } = getAppContext();
const auth = stores.auth;
const i18n = createI18n();

let isLoading = $state(false);
let error = $state('');

// Redirect if already onboarded
$effect(() => {
  if ($auth.isInitialized && $auth.user?.hasCompletedOnboarding) {
    goto('/friends');
  }
});

async function handleSubmit(data: FriendCreateData) {
  isLoading = true;
  error = '';

  try {
    await api.auth.createSelfProfile(data);
    // Refresh user data to update onboarding status
    await auth.refreshUserData();
    goto('/friends');
  } catch (err) {
    error = (err as Error)?.message ?? $i18n.t('onboarding.error.generic');
    isLoading = false;
  }
}
</script>

<svelte:head>
  <title>{$i18n.t('onboarding.pageTitle')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="form"
  title={$i18n.t('onboarding.title')}
  subtitle={$i18n.t('onboarding.firstEntry')}
>
  {#if error.length > 0}
    <div class="mb-6">
      <AlertBanner variant="error">{error}</AlertBanner>
    </div>
  {/if}

  <FriendForm isOnboarding={true} onSubmit={handleSubmit} submitLabel={$i18n.t('onboarding.complete')} {isLoading} />
</PageShell>
