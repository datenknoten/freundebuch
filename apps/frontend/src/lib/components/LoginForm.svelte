<script lang="ts">
import Key from 'svelte-heros-v2/Key.svelte';
import { goto } from '$app/navigation';
import { autoFocus } from '$lib/actions/autoFocus';
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { auth } from '$lib/stores/auth';

const i18n = createI18n();

let email = $state('');
let password = $state('');
let isLoading = $state(false);
let isPasskeyLoading = $state(false);
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
    error = (err as Error)?.message || $i18n.t('auth.login.error.generic');
    isLoading = false;
  }
}

async function handlePasskeySignIn() {
  error = '';
  isPasskeyLoading = true;

  try {
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      error = result.error.message || $i18n.t('profile.passkeys.signInFailed');
      isPasskeyLoading = false;
    } else {
      // Refresh the auth store so the app has the user data
      await auth.initialize();
      goto('/');
    }
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('profile.passkeys.signInFailed');
    isPasskeyLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<h2 class="text-3xl font-heading text-forest mb-2">{$i18n.t('auth.login.title')}</h2>
		<p class="text-gray-600 font-body">{$i18n.t('auth.login.subtitle')}</p>
	</div>

	{#if error}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	<div>
		<label for="email" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			{$i18n.t('auth.login.email')}
		</label>
		<input
			type="email"
			id="email"
			bind:value={email}
			required
			autocomplete="username webauthn"
            use:autoFocus
			class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
			placeholder={$i18n.t('auth.login.emailPlaceholder')}
			disabled={isLoading}
		/>
	</div>

	<div>
		<label for="password" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			{$i18n.t('auth.login.password')}
		</label>
		<input
			type="password"
			id="password"
			bind:value={password}
			required
			autocomplete="current-password"
			minlength="8"
			class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
			placeholder={$i18n.t('auth.login.passwordPlaceholder')}
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
				{$i18n.t('auth.login.rememberMe')}
			</label>
		</div>
		<a
			href="/auth/forgot-password"
			class="text-sm font-body font-semibold text-forest hover:text-forest-light"
		>
			{$i18n.t('auth.login.forgotPassword')}
		</a>
	</div>

	<button
		type="submit"
		disabled={isLoading || isPasskeyLoading}
		class="w-full bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{isLoading ? $i18n.t('common.loading') : $i18n.t('auth.login.submit')}
	</button>

	<div class="relative">
		<div class="absolute inset-0 flex items-center">
			<div class="w-full border-t border-gray-300"></div>
		</div>
		<div class="relative flex justify-center text-sm">
			<span class="px-2 bg-white text-gray-500 font-body">{$i18n.t('common.or')}</span>
		</div>
	</div>

	<button
		type="button"
		onclick={handlePasskeySignIn}
		disabled={isPasskeyLoading || isLoading}
		class="w-full flex items-center justify-center gap-2 bg-white text-gray-800 py-3 px-4 rounded-lg font-body font-semibold border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		<Key class="w-5 h-5" strokeWidth="2" />
		{isPasskeyLoading ? $i18n.t('profile.passkeys.signingIn') : $i18n.t('profile.passkeys.signIn')}
	</button>

	<p class="text-center text-sm font-body text-gray-600">
		{$i18n.t('auth.login.noAccount')}
		<a href="/auth/register" class="font-semibold text-forest hover:text-forest-light">
			{$i18n.t('auth.login.registerLink')}
		</a>
	</p>
</form>
