<script lang="ts">
import { goto } from '$app/navigation';
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/alert-banner.svelte';
import Button from '$lib/components/ui/button.svelte';
import FormInput from '$lib/components/ui/form-input.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

let { token } = $props();

let password = $state('');
let confirmPassword = $state('');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  error = '';

  // Client-side validation
  if (password !== confirmPassword) {
    error = 'Passwords do not match';
    return;
  }

  if (password.length < 8) {
    error = 'Password must be at least 8 characters';
    return;
  }

  isLoading = true;

  try {
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (result.error) {
      error = result.error.message || 'Password reset failed';
      isLoading = false;
      return;
    }

    success = true;
    isLoading = false;

    // Redirect to login after 2 seconds
    setTimeout(() => {
      goto('/auth/login');
    }, 2000);
  } catch (err) {
    error = (err as Error)?.message || 'Password reset failed';
    isLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<h2 class="text-3xl font-heading text-forest mb-2">Create new password</h2>
		<p class="text-gray-600 font-body">Enter your new password below</p>
	</div>

	{#if error.length > 0}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	{#if success}
		<AlertBanner variant="success">
			<p class="font-semibold mb-2">Password reset successful!</p>
			<p>Your password has been reset. Redirecting to login...</p>
		</AlertBanner>
	{:else}
		<FormInput
			id="password"
			type="password"
			label="New password"
			bind:value={password}
			placeholder="••••••••"
			autocomplete="new-password"
			minlength={8}
			helper={$i18n.t('auth.passwordHelp')}
			disabled={isLoading}
			required
		/>

		<FormInput
			id="confirm-password"
			type="password"
			label="Confirm new password"
			bind:value={confirmPassword}
			placeholder="••••••••"
			autocomplete="new-password"
			minlength={8}
			helper={$i18n.t('auth.passwordHelp')}
			disabled={isLoading}
			required
		/>

		<Button type="submit" block loading={isLoading}>Reset password</Button>
	{/if}

	<p class="text-center text-sm font-body text-gray-600">
		Remember your password?
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			Sign in
		</a>
	</p>
</form>
