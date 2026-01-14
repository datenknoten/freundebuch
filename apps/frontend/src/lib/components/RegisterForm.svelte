<script lang="ts">
import { goto } from '$app/navigation';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import { auth } from '$lib/stores/auth';

let email = $state('');
let password = $state('');
let confirmPassword = $state('');
let isLoading = $state(false);
let error = $state('');

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
    await auth.register(email, password);
    // Redirect to home page after successful registration
    goto('/');
  } catch (err) {
    error = (err as Error)?.message || 'Registration failed';
    isLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<h2 class="text-3xl font-heading text-forest mb-2">Create an account</h2>
		<p class="text-gray-600 font-body">Start managing your relationships today</p>
	</div>

	{#if error}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

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

	<div>
		<label for="password" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			Password
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
		<label for="confirm-password" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			Confirm password
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

	<div class="flex items-start">
		<input
			type="checkbox"
			id="terms"
			required
			class="h-4 w-4 text-forest focus:ring-forest border-gray-300 rounded mt-1"
		/>
		<label for="terms" class="ml-2 block text-sm font-body text-gray-700">
			I agree to the
			<a href="/terms" class="font-semibold text-forest hover:text-forest-light">
				Terms of Service
			</a>
			and
			<a href="/privacy" class="font-semibold text-forest hover:text-forest-light">
				Privacy Policy
			</a>
		</label>
	</div>

	<button
		type="submit"
		disabled={isLoading}
		class="w-full bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{isLoading ? 'Creating account...' : 'Create account'}
	</button>

	<p class="text-center text-sm font-body text-gray-600">
		Already have an account?
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			Sign in
		</a>
	</p>
</form>
