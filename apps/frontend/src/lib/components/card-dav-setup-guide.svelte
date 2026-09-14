<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import AlertBanner from '$lib/components/alert-banner.svelte';
import TabNav from '$lib/components/tab-nav.svelte';
import { codeClasses } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';
import { TRANSIENT_FEEDBACK_MS } from '$lib/utils/timing';

const i18n = createI18n();

interface Props {
  serverUrl?: string;
}

let { serverUrl = '' }: Props = $props();

// Derive the CardDAV URL from the current location if not provided
const carddavUrl = $derived(
  serverUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/carddav/`,
);

type CardDavTab = 'ios' | 'macos' | 'thunderbird';

let activeTab = $state<CardDavTab>('ios');
let copied = $state(false);

const tabs = $derived([
  { id: 'ios' as const, label: $i18n.t('profile.carddav.ios') },
  { id: 'macos' as const, label: $i18n.t('profile.carddav.macos') },
  { id: 'thunderbird' as const, label: $i18n.t('profile.carddav.thunderbird') },
]);

function flagCopied() {
  copied = true;
  setTimeout(() => {
    copied = false;
  }, TRANSIENT_FEEDBACK_MS);
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(carddavUrl);
    flagCopied();
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input');
    input.value = carddavUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    flagCopied();
  }
}
</script>

<div class="space-y-6">
  <AlertBanner variant="info" title={$i18n.t('profile.carddav.serverUrl')}>
    <div class="flex items-center gap-2 mt-2">
      <code class="flex-1 {codeClasses.inline} break-all">
        {carddavUrl}
      </code>
      <Button size="sm" onclick={copyUrl} class="shrink-0">
        {copied ? $i18n.t('profile.carddav.copied') : $i18n.t('profile.carddav.copy')}
      </Button>
    </div>
    <p class="text-xs mt-2">
      {$i18n.t('profile.carddav.useCredentials', { email: $currentUser?.email })}
    </p>
  </AlertBanner>

  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <TabNav {tabs} active={activeTab} onselect={(id) => (activeTab = id)} />

    <div
      id="tabpanel-{activeTab}"
      role="tabpanel"
      aria-labelledby="tab-{activeTab}"
      tabindex="-1"
      class="p-4"
    >
      {#if activeTab === 'ios'}
        <ol class="list-decimal list-inside space-y-3 font-body text-gray-700">
          <li>{@html $i18n.t('profile.carddav.steps.ios.1')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.ios.2')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.ios.3')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.ios.4')}</li>
          <li>
            {@html $i18n.t('profile.carddav.steps.ios.5')}
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-gray-600">
              <li><strong>{$i18n.t('profile.carddav.fields.server')}</strong> {carddavUrl}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.userName')}</strong> {$currentUser?.email}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.password')}</strong> {$i18n.t('profile.carddav.fields.yourAppPassword')}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.description')}</strong> Freundebuch</li>
            </ul>
          </li>
          <li>{@html $i18n.t('profile.carddav.steps.ios.6')}</li>
        </ol>
      {:else if activeTab === 'macos'}
        <ol class="list-decimal list-inside space-y-3 font-body text-gray-700">
          <li>{@html $i18n.t('profile.carddav.steps.macos.1')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.macos.2')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.macos.3')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.macos.4')}</li>
          <li>
            {@html $i18n.t('profile.carddav.steps.macos.5')}
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-gray-600">
              <li><strong>{$i18n.t('profile.carddav.fields.accountType')}</strong> {$i18n.t('profile.carddav.fields.manual')}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.userName')}</strong> {$currentUser?.email}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.password')}</strong> {$i18n.t('profile.carddav.fields.yourAppPassword')}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.serverAddress')}</strong> {carddavUrl}</li>
            </ul>
          </li>
          <li>{@html $i18n.t('profile.carddav.steps.macos.6')}</li>
        </ol>
      {:else if activeTab === 'thunderbird'}
        <ol class="list-decimal list-inside space-y-3 font-body text-gray-700">
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.1')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.2')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.3')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.4')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.5')}</li>
          <li>
            {@html $i18n.t('profile.carddav.steps.thunderbird.6')}
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-gray-600">
              <li><strong>{$i18n.t('profile.carddav.fields.url')}</strong> {carddavUrl}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.user')}</strong> {$currentUser?.email}</li>
              <li><strong>{$i18n.t('profile.carddav.fields.password')}</strong> {$i18n.t('profile.carddav.fields.yourAppPassword')}</li>
            </ul>
          </li>
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.7')}</li>
          <li>{@html $i18n.t('profile.carddav.steps.thunderbird.8')}</li>
        </ol>
      {/if}
    </div>
  </div>

  <AlertBanner variant="warning" title={$i18n.t('profile.carddav.important')}>
    <div class="flex items-start gap-2">
      <ExclamationTriangle class="w-5 h-5 shrink-0 mt-0.5" strokeWidth="2" />
      <p>{@html $i18n.t('profile.carddav.importantNote')}</p>
    </div>
  </AlertBanner>
</div>
