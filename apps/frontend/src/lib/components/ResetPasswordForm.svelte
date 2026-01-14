<script lang="ts">
import { goto } from '$app/navigation';
import * as authApi from '$lib/api/auth';
import AlertBanner from '$lib/components/AlertBanner.svelte';

let { token } = $props();

let password = $state('');
let confirmPassword = $state('');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(e) {
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
    await authApi.resetPassword({ token, password });
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

	{#if error}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	{#if success}
		<AlertBanner variant="success">
			<p class="font-semibold mb-2">Password reset successful!</p>
			<p>Your password has been reset. Redirecting to login...</p>
		</AlertBanner>
	{:else}
		<div>
			<label for="password" class="block text-sm font-body font-semibold text-gray-700 mb-2">
				New password
			</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				required
				autocomplete="new-password"
				minlength="8"
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
				placeholder="••••••••"
				disabled={isLoading}
			/>
			<p class="mt-1 text-xs font-body text-gray-500">
				Must be at least 8 characters long
			</p>
		</div>

		<div>
			<label
				for="confirm-password"
				class="block text-sm font-body font-semibold text-gray-700 mb-2"
			>
				Confirm new password
			</label>
			<input
				type="password"
				id="confirm-password"
				bind:value={confirmPassword}
				required
				autocomplete="new-password"
				minlength="8"
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
				placeholder="••••••••"
				disabled={isLoading}
			/>
		</div>

		<button
			type="submit"
			disabled={isLoading}
			class="w-full bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isLoading ? 'Resetting password...' : 'Reset password'}
		</button>
	{/if}

	<p class="text-center text-sm font-body text-gray-600">
		Remember your password?
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			Sign in
		</a>
	</p>
</form>
