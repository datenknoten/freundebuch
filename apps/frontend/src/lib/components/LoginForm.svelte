<script lang="ts">
import { goto } from '$app/navigation';
import { auth } from '$lib/stores/auth';

let email = $state('');
let password = $state('');
let isLoading = $state(false);
let error = $state('');

async function handleSubmit(e) {
  e.preventDefault();
  error = '';
  isLoading = true;

  try {
    await auth.login(email, password);
    // Redirect to home page after successful login
    goto('/');
  } catch (err) {
    error = (err as Error)?.message || 'Login failed';
    isLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<h2 class="text-3xl font-heading text-forest mb-2">Welcome back</h2>
		<p class="text-gray-600 font-body">Sign in to your account</p>
	</div>

	{#if error}
		<div
			class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm"
			role="alert"
		>
			{error}
		</div>
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
			autocomplete="current-password"
			minlength="8"
			class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
			placeholder="••••••••"
			disabled={isLoading}
		/>
	</div>

	<div class="flex items-center justify-between">
		<div class="flex items-center">
			<input
				type="checkbox"
				id="remember"
				class="h-4 w-4 text-forest focus:ring-forest border-gray-300 rounded"
			/>
			<label for="remember" class="ml-2 block text-sm font-body text-gray-700">
				Remember me
			</label>
		</div>
		<a
			href="/auth/forgot-password"
			class="text-sm font-body font-semibold text-forest hover:text-forest-light"
		>
			Forgot password?
		</a>
	</div>

	<button
		type="submit"
		disabled={isLoading}
		class="w-full bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{isLoading ? 'Signing in...' : 'Sign in'}
	</button>

	<p class="text-center text-sm font-body text-gray-600">
		Don't have an account?
		<a href="/auth/register" class="font-semibold text-forest hover:text-forest-light">
			Create one
		</a>
	</p>
</form>
