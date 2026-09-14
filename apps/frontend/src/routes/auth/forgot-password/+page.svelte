<script lang="ts">
import ForgotPasswordForm from '$lib/components/forgot-password-form.svelte';
import { PageShell } from '$lib/components/ui';
</script>

<svelte:head>
	<title>Reset Password | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title="Reset your password"
	subtitle="Enter your email to receive a password reset link"
>
	<ForgotPasswordForm />
</PageShell>
