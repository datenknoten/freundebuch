<script lang="ts">
import { page } from '$app/stores';
import ResetPasswordForm from '$lib/components/ResetPasswordForm.svelte';
import Button from '$lib/components/ui/Button.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

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
