<script lang="ts">
import { goto } from '$app/navigation';
import { authClient } from '$lib/auth-client';
import AlertBanner from '$lib/components/alert-banner.svelte';
import Button from '$lib/components/ui/button.svelte';
import FormInput from '$lib/components/ui/form-input.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

interface Props {
  /** The one-time token from the reset link's query string. */
  token: string;
}

let { token }: Props = $props();

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
    error = $i18n.t('auth.resetPassword.error.mismatch');
    return;
  }

  if (password.length < 8) {
    error = $i18n.t('auth.resetPassword.error.tooShort');
    return;
  }

  isLoading = true;

  try {
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (result.error) {
      error = result.error.message ?? $i18n.t('auth.resetPassword.error.generic');
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
    error = (err as Error)?.message ?? $i18n.t('auth.resetPassword.error.generic');
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
			<p class="font-semibold mb-2">{$i18n.t('auth.resetPassword.successTitle')}</p>
			<p>{$i18n.t('auth.resetPassword.successBody')}</p>
		</AlertBanner>
	{:else}
		<FormInput
			id="password"
			type="password"
			label={$i18n.t('auth.resetPassword.newPassword')}
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
			label={$i18n.t('auth.resetPassword.confirmNewPassword')}
			bind:value={confirmPassword}
			placeholder="••••••••"
			autocomplete="new-password"
			minlength={8}
			helper={$i18n.t('auth.passwordHelp')}
			disabled={isLoading}
			required
		/>

		<Button type="submit" block loading={isLoading}>{$i18n.t('auth.resetPassword.submit')}</Button>
	{/if}

	<p class="text-center text-sm font-body text-gray-600">
		{$i18n.t('auth.forgotPassword.rememberPassword')}
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			{$i18n.t('auth.forgotPassword.signIn')}
		</a>
	</p>
</form>
