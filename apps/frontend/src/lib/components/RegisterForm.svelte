<script lang="ts">
import { goto } from '$app/navigation';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { auth } from '$lib/stores/auth';

const i18n = createI18n();

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
    error = $i18n.t('auth.register.error.passwordMismatch');
    return;
  }

  if (password.length < 8) {
    error = $i18n.t('auth.register.error.weakPassword');
    return;
  }

  isLoading = true;

  try {
    await auth.register(email, password);
    // Redirect to home page after successful registration
    goto('/');
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('auth.register.error.generic');
    isLoading = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<h2 class="text-3xl font-heading text-forest mb-2">{$i18n.t('auth.register.title')}</h2>
		<p class="text-gray-600 font-body">{$i18n.t('auth.register.subtitle')}</p>
	</div>

	{#if error}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	<div>
		<label for="email" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			{$i18n.t('auth.register.emailAddress')}
		</label>
		<input
			type="email"
			id="email"
			bind:value={email}
			required
			autocomplete="email"
			class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body"
			placeholder={$i18n.t('auth.register.emailPlaceholder')}
			disabled={isLoading}
		/>
	</div>

	<div>
		<label for="password" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			{$i18n.t('auth.register.password')}
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
			{$i18n.t('auth.register.passwordHelp')}
		</p>
	</div>

	<div>
		<label for="confirm-password" class="block text-sm font-body font-semibold text-gray-700 mb-2">
			{$i18n.t('auth.register.confirmPassword')}
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
			{$i18n.t('auth.register.termsAgree')}
			<a href="/terms" class="font-semibold text-forest hover:text-forest-light">
				{$i18n.t('auth.register.termsOfService')}
			</a>
			{$i18n.t('auth.register.and')}
			<a href="/privacy" class="font-semibold text-forest hover:text-forest-light">
				{$i18n.t('auth.register.privacyPolicy')}
			</a>
		</label>
	</div>

	<button
		type="submit"
		disabled={isLoading}
		class="w-full bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{isLoading ? $i18n.t('auth.register.creating') : $i18n.t('auth.register.submit')}
	</button>

	<p class="text-center text-sm font-body text-gray-600">
		{$i18n.t('auth.register.hasAccount')}
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			{$i18n.t('auth.register.loginLink')}
		</a>
	</p>
</form>
