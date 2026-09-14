<script lang="ts">
import { page } from '$app/stores';
import ResetPasswordForm from '$lib/components/reset-password-form.svelte';
import { PageShell } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

// Get the reset token from URL query parameter
const token = $derived($page.url.searchParams.get('token') || '');
</script>

<svelte:head>
	<title>{$i18n.t('auth.resetPassword.title')} | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={token
		? $i18n.t('auth.resetPassword.heading')
		: $i18n.t('auth.resetPassword.invalidTitle')}
	subtitle={token ? $i18n.t('auth.resetPassword.description') : undefined}
>
	{#if token}
		<ResetPasswordForm {token} />
	{:else}
		<div class="text-center">
			<p class="text-gray-600 font-body mb-6">
				{$i18n.t('auth.resetPassword.invalidBody')}
			</p>
			<Button href="/auth/forgot-password">{$i18n.t('auth.resetPassword.requestNew')}</Button>
		</div>
	{/if}
</PageShell>
