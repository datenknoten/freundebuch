<script lang="ts">
import { page } from '$app/stores';
import ResetPasswordForm from '$lib/components/reset-password-form.svelte';
import { PageShell } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';

// Get the reset token from URL query parameter
const token = $derived($page.url.searchParams.get('token') || '');
</script>

<svelte:head>
	<title>Set New Password | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={token ? 'Create new password' : 'Invalid Reset Link'}
	subtitle={token ? 'Enter your new password below' : undefined}
>
	{#if token}
		<ResetPasswordForm {token} />
	{:else}
		<div class="text-center">
			<p class="text-gray-600 font-body mb-6">
				This password reset link is invalid or has expired.
			</p>
			<Button href="/auth/forgot-password">Request a new reset link</Button>
		</div>
	{/if}
</PageShell>
