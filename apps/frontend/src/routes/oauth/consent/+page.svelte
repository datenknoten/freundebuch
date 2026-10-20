<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const { api, logger } = getAppContext();
const i18n = createI18n();

// The authorization server redirects here with these params (see the `mcp`
// plugin's consentPage flow).
const consentCode = $derived($page.url.searchParams.get('consent_code') ?? '');
const clientId = $derived($page.url.searchParams.get('client_id') ?? '');
const scopes = $derived(
  ($page.url.searchParams.get('scope') ?? '').split(/\s+/).filter((s) => s.length > 0),
);

let clientName = $state('');
let isSubmitting = $state(false);
let error = $state('');

// Human-readable descriptions for the standard scopes; unknown scopes fall
// back to showing the raw scope string.
function scopeLabel(scope: string) {
  const key = `oauth.consent.scopes.${scope}`;
  const translated = $i18n.t(key);
  return translated === key ? scope : translated;
}

async function resolveClientName() {
  if (clientId === '') {
    return;
  }
  try {
    const client = await api.oauth.getClient(clientId);
    clientName = client.name;
  } catch (err) {
    // The subtitle falls back to the client id.
    logger.warn({ err }, 'Failed to resolve the OAuth client name');
  }
}
onMount(resolveClientName);

async function submitConsent(isAccepted: boolean) {
  if (isSubmitting === true) {
    return;
  }
  error = '';
  isSubmitting = true;
  try {
    const consent = await api.oauth.submitConsent(consentCode, isAccepted);
    // Full navigation: the callback belongs to the client's origin.
    window.location.href = consent.redirectURI;
  } catch (err) {
    logger.warn({ err }, 'Failed to submit the OAuth consent');
    error = $i18n.t('oauth.consent.error');
    isSubmitting = false;
  }
}
</script>

<svelte:head>
	<title>{$i18n.t('oauth.consent.title')} | Freundebuch</title>
</svelte:head>

<PageShell
	width="narrow"
	centered
	title={consentCode
		? $i18n.t('oauth.consent.title')
		: $i18n.t('oauth.consent.invalidTitle')}
	subtitle={consentCode
		? $i18n.t('oauth.consent.subtitle', { client: clientName || clientId })
		: undefined}
>
	{#if !consentCode}
		<div class="text-center">
			<p class="text-gray-600 font-body mb-6">{$i18n.t('oauth.consent.invalidBody')}</p>
			<Button href="/">{$i18n.t('oauth.consent.backHome')}</Button>
		</div>
	{:else}
		{#if error}
			<div class="mb-6">
				<AlertBanner variant="error">{error}</AlertBanner>
			</div>
		{/if}

		<div class="mb-6">
			<p class="text-sm font-body font-semibold text-gray-700 mb-3">
				{$i18n.t('oauth.consent.permissionsHeading')}
			</p>
			<ul class="space-y-2">
				{#each scopes as scope (scope)}
					<li class="flex items-start gap-2 text-sm font-body text-gray-700">
						<span class="text-forest mt-0.5">✓</span>
						<span>{scopeLabel(scope)}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="flex gap-3">
			<Button
				variant="secondary"
				class="flex-1"
				onclick={() => submitConsent(false)}
				disabled={isSubmitting}
			>
				{$i18n.t('oauth.consent.deny')}
			</Button>
			<Button class="flex-1" loading={isSubmitting} onclick={() => submitConsent(true)}>
				{$i18n.t('oauth.consent.allow')}
			</Button>
		</div>
	{/if}
</PageShell>
