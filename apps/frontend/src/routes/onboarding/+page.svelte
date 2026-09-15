<script lang="ts">
import { goto } from '$app/navigation';
import * as authApi from '$lib/api/auth';
import AlertBanner from '$lib/components/alert-banner.svelte';
import FriendForm from '$lib/components/friends/friend-form.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { auth, refreshUserData } from '$lib/stores/auth';
import type { FriendCreateInput } from '$shared';

const i18n = createI18n();

let isLoading = $state(false);
let error = $state('');

// Redirect if already onboarded
$effect(() => {
  if ($auth.isInitialized && $auth.user?.hasCompletedOnboarding) {
    goto('/friends');
  }
});

async function handleSubmit(data: FriendCreateInput) {
  isLoading = true;
  error = '';

  try {
    await authApi.createSelfProfile(data);
    // Refresh user data to update onboarding status
    await refreshUserData();
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
