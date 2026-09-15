<script lang="ts">
import ForgotPasswordForm from '$lib/components/forgot-password-form.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
	<title>{$i18n.t('auth.forgotPassword.title')} | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={$i18n.t('auth.forgotPassword.heading')}
	subtitle={$i18n.t('auth.forgotPassword.description')}
>
	<ForgotPasswordForm />
</PageShell>
