<script lang="ts">
import LoginForm from '$lib/components/LoginForm.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();
</script>

<svelte:head>
	<title>{$i18n.t('auth.login.title')} | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={$i18n.t('auth.login.title')}
	subtitle={$i18n.t('auth.login.subtitle')}
>
	<LoginForm />
</PageShell>
