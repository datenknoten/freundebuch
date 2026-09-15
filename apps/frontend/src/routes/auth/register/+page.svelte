<script lang="ts">
import RegisterForm from '$lib/components/register-form.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
	<title>{$i18n.t('auth.register.title')} | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={$i18n.t('auth.register.title')}
	subtitle={$i18n.t('auth.register.subtitle')}
>
	<RegisterForm />
</PageShell>
