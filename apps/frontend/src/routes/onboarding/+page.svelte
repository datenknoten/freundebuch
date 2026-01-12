<script lang="ts">
import { goto } from '$app/navigation';
import * as authApi from '$lib/api/auth';
import FriendForm from '$lib/components/friends/FriendForm.svelte';
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

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-2xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <h1 class="text-3xl font-heading text-forest mb-2">Welcome to Freundebuch!</h1>
      <p class="text-gray-600 font-body mb-6">
        The first entry in your friendbook is you! Fill in your details to get started.
      </p>

      {#if error}
        <div
          class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 font-body text-sm"
          role="alert"
        >
          {error}
        </div>
      {/if}

      <FriendForm
        isOnboarding={true}
        onSubmit={handleSubmit}
        submitLabel="Complete Setup"
        {isLoading}
      />
    </div>
  </div>
</div>
