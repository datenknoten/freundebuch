<script lang="ts">
import { goto } from '$app/navigation';
import * as authApi from '$lib/api/auth';
import AlertBanner from '$lib/components/alert-banner.svelte';
import FriendForm from '$lib/components/friends/friend-form.svelte';
import { PageShell } from '$lib/components/ui';
import { auth, refreshUserData } from '$lib/stores/auth';
import type { FriendCreateInput } from '$shared';

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
    error = (err as Error)?.message || 'Failed to create your profile';
    isLoading = false;
  }
}
</script>

<svelte:head>
  <title>Welcome to Freundebuch</title>
</svelte:head>

<PageShell
  width="form"
  title="Welcome to Freundebuch!"
  subtitle="The first entry in your friendbook is you! Fill in your details to get started."
>
  {#if error}
    <div class="mb-6">
      <AlertBanner variant="error">{error}</AlertBanner>
    </div>
  {/if}

  <FriendForm isOnboarding={true} onSubmit={handleSubmit} submitLabel="Complete Setup" {isLoading} />
</PageShell>
