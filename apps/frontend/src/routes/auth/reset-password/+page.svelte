<script lang="ts">
import { page } from '$app/stores';
import ResetPasswordForm from '$lib/components/ResetPasswordForm.svelte';

// Get the reset token from URL query parameter
const token = $derived($page.url.searchParams.get('token') || '');
</script>

<svelte:head>
	<title>Reset Password | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
		{#if token}
			<ResetPasswordForm {token} />
		{:else}
			<div class="text-center">
				<h2 class="text-3xl font-heading text-forest mb-4">Invalid Reset Link</h2>
				<p class="text-gray-600 font-body mb-6">
					This password reset link is invalid or has expired.
				</p>
				<a
					href="/auth/forgot-password"
					class="inline-block bg-forest text-white py-3 px-6 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
				>
					Request a new reset link
				</a>
			</div>
		{/if}
	</div>
</div>
