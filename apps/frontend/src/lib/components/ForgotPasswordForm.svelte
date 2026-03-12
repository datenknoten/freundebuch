<script lang="ts">
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/AlertBanner.svelte';

let email = $state('');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(e) {
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
	<div>
		<h2 class="text-3xl font-heading text-forest mb-2">Reset your password</h2>
		<p class="text-gray-600 font-body">Enter your email to receive a password reset link</p>
	</div>

	{#if error}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	{#if success}
		<AlertBanner variant="success">
			<p class="font-semibold mb-2">Password reset link sent!</p>
			<p>If the email exists, a password reset link has been sent. Please check your inbox.</p>
		</AlertBanner>
	{/if}

	{#if !success}
		<div>
			<label for="email" class="block text-sm font-body font-semibold text-gray-700 mb-2">
				Email address
			</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				required
				autocomplete="email"
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
				placeholder="you@example.com"
				disabled={isLoading}
			/>
		</div>

		<button
			type="submit"
			disabled={isLoading}
			class="w-full bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isLoading ? 'Sending...' : 'Send reset link'}
		</button>
	{/if}

	<p class="text-center text-sm font-body text-gray-600">
		Remember your password?
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			Sign in
		</a>
	</p>
</form>
