<script lang="ts">
import LoginForm from '$lib/components/login-form.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
	<title>Sign In | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={$i18n.t('auth.login.title')}
	subtitle={$i18n.t('auth.login.subtitle')}
>
	<LoginForm />
</PageShell>
