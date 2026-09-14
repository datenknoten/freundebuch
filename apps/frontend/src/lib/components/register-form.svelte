<script lang="ts">
import { goto } from '$app/navigation';
import AlertBanner from '$lib/components/alert-banner.svelte';
import Button from '$lib/components/ui/button.svelte';
import FormInput from '$lib/components/ui/form-input.svelte';
import { formClasses } from '$lib/components/ui/styles';
import { createI18n } from '$lib/i18n/index.js';
import { auth } from '$lib/stores/auth';

const i18n = createI18n();

let email = $state('');
let password = $state('');
let confirmPassword = $state('');
let isLoading = $state(false);
let error = $state('');

async function handleSubmit(e: SubmitEvent) {
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

	{#if error.length > 0}
		<AlertBanner variant="error">{error}</AlertBanner>
	{/if}

	<FormInput
		id="email"
		type="email"
		label={$i18n.t('auth.register.emailAddress')}
		bind:value={email}
		placeholder={$i18n.t('auth.register.emailPlaceholder')}
		autocomplete="email"
		disabled={isLoading}
		required
		autofocus
	/>

	<FormInput
		id="password"
		type="password"
		label={$i18n.t('auth.register.password')}
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
		label={$i18n.t('auth.register.confirmPassword')}
		bind:value={confirmPassword}
		placeholder="••••••••"
		autocomplete="new-password"
		minlength={8}
		helper={$i18n.t('auth.passwordHelp')}
		disabled={isLoading}
		required
	/>

	<div class="flex items-start gap-2">
		<input type="checkbox" id="terms" required class="{formClasses.checkbox} mt-1" />
		<label for="terms" class={formClasses.checkboxLabel}>
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

	<Button type="submit" block loading={isLoading}>
		{$i18n.t('auth.register.submit')}
	</Button>

	<p class="text-center text-sm font-body text-gray-600">
		{$i18n.t('auth.register.hasAccount')}
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			{$i18n.t('auth.register.loginLink')}
		</a>
	</p>
</form>
