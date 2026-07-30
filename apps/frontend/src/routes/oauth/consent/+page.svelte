<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/stores';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { createI18n } from '$lib/i18n/index.js';

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
function scopeLabel(scope: string): string {
  const key = `oauth.consent.scopes.${scope}`;
  const translated = $i18n.t(key);
  return translated === key ? scope : translated;
}

onMount(async () => {
  if (!clientId) return;
  try {
    const res = await fetch(`/api/auth/oauth2/client/${encodeURIComponent(clientId)}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      clientName = data?.name ?? '';
    }
  } catch {
    // Non-fatal: fall back to showing the client id.
  }
});

async function submitConsent(accept: boolean) {
  if (isSubmitting) return;
  error = '';
  isSubmitting = true;

  try {
    const res = await fetch('/api/auth/oauth2/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accept, consent_code: consentCode }),
    });

    if (!res.ok) {
      error = $i18n.t('oauth.consent.error');
      isSubmitting = false;
      return;
    }

    const data = await res.json();
    if (data?.redirectURI) {
      // Full navigation back to the client's callback (external origin).
      window.location.href = data.redirectURI;
      return;
    }

    error = $i18n.t('oauth.consent.error');
    isSubmitting = false;
  } catch {
    error = $i18n.t('oauth.consent.error');
    isSubmitting = false;
  }
}
</script>

<svelte:head>
	<title>{$i18n.t('oauth.consent.title')} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
		{#if !consentCode}
			<div class="text-center">
				<h2 class="text-3xl font-heading text-forest mb-4">{$i18n.t('oauth.consent.invalidTitle')}</h2>
				<p class="text-gray-600 font-body mb-6">{$i18n.t('oauth.consent.invalidBody')}</p>
				<a
					href="/"
					class="inline-block bg-forest text-white py-3 px-6 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
				>
					{$i18n.t('oauth.consent.backHome')}
				</a>
			</div>
		{:else}
			<h2 class="text-3xl font-heading text-forest mb-2">{$i18n.t('oauth.consent.title')}</h2>
			<p class="text-gray-600 font-body mb-6">
				{$i18n.t('oauth.consent.subtitle', { client: clientName || clientId })}
			</p>

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
				<button
					type="button"
					onclick={() => submitConsent(false)}
					disabled={isSubmitting}
					class="flex-1 bg-white text-gray-800 py-3 px-4 rounded-lg font-body font-semibold border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{$i18n.t('oauth.consent.deny')}
				</button>
				<button
					type="button"
					onclick={() => submitConsent(true)}
					disabled={isSubmitting}
					class="flex-1 bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? $i18n.t('common.loading') : $i18n.t('oauth.consent.allow')}
				</button>
			</div>
		{/if}
	</div>
</div>
