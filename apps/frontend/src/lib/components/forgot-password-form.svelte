<script lang="ts">
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/alert-banner.svelte';
import Button from '$lib/components/ui/button.svelte';
import FormInput from '$lib/components/ui/form-input.svelte';

let email = $state('');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  error = '';
  isLoading = true;
  success = false;

  try {
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (result.error) {
      error = result.error.message || 'Failed to send reset email';
      isLoading = false;
      return;
    }

    success = true;
    isLoading = false;
  } catch (err) {
    error = (err as Error)?.message || 'Failed to send reset email';
    isLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	{#if error.length > 0}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	{#if success}
		<AlertBanner variant="success">
			<p class="font-semibold mb-2">Password reset link sent!</p>
			<p>If the email exists, a password reset link has been sent. Please check your inbox.</p>
		</AlertBanner>
	{/if}

	{#if !success}
		<FormInput
			id="email"
			type="email"
			label="Email address"
			bind:value={email}
			placeholder="you@example.com"
			autocomplete="email"
			disabled={isLoading}
			required
		/>

		<Button type="submit" block loading={isLoading}>Send reset link</Button>
	{/if}

	<p class="text-center text-sm font-body text-gray-600">
		Remember your password?
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			Sign in
		</a>
	</p>
</form>
