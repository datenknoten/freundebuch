<script lang="ts">
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import FormInput from '$lib/components/ui/FormInput.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const authClient = getAppContext().authClient;
const i18n = createI18n();

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

    if (result.error !== null && result.error !== undefined) {
      error = result.error.message ?? $i18n.t('auth.forgotPassword.error.generic');
      isLoading = false;
      return;
    }

    success = true;
    isLoading = false;
  } catch (err) {
    error = err instanceof Error ? err.message : $i18n.t('auth.forgotPassword.error.generic');
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
			<p class="font-semibold mb-2">{$i18n.t('auth.forgotPassword.successTitle')}</p>
			<p>{$i18n.t('auth.forgotPassword.successBody')}</p>
		</AlertBanner>
	{/if}

	{#if !success}
		<FormInput
			id="email"
			type="email"
			label={$i18n.t('auth.forgotPassword.emailLabel')}
			bind:value={email}
			placeholder={$i18n.t('auth.forgotPassword.emailPlaceholder')}
			autocomplete="email"
			disabled={isLoading}
			required
		/>

		<Button type="submit" block loading={isLoading}>{$i18n.t('auth.forgotPassword.submit')}</Button>
	{/if}

	<p class="text-center text-sm font-body text-gray-600">
		{$i18n.t('auth.forgotPassword.rememberPassword')}
		<a href="/auth/login" class="font-semibold text-forest hover:text-forest-light">
			{$i18n.t('auth.forgotPassword.signIn')}
		</a>
	</p>
</form>
