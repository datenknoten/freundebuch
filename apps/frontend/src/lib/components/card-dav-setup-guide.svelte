<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';

const i18n = createI18n();

interface Props {
  serverUrl?: string;
}

let { serverUrl = '' }: Props = $props();

// Derive the CardDAV URL from the current location if not provided
const carddavUrl = $derived(
  serverUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/carddav/`,
);

let activeTab = $state<'ios' | 'macos' | 'thunderbird'>('ios');
let copied = $state(false);

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(carddavUrl);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input');
    input.value = carddavUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
}
</script>

<div class="space-y-6">
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h4 class="font-body font-semibold text-blue-800 mb-2">{$i18n.t('profile.carddav.serverUrl')}</h4>
    <div class="flex items-center gap-2">
      <code class="flex-1 bg-white border border-blue-200 rounded px-3 py-2 font-mono text-sm break-all">
        {carddavUrl}
      </code>
      <button
        onclick={copyUrl}
        class="shrink-0 bg-blue-600 text-white px-3 py-2 rounded font-body text-sm hover:bg-blue-700 transition-colors"
      >
        {copied ? $i18n.t('profile.carddav.copied') : $i18n.t('profile.carddav.copy')}
      </button>
    </div>
    <p class="font-body text-xs text-blue-600 mt-2">
      {$i18n.t('profile.carddav.useCredentials', { email: $currentUser?.email })}
    </p>
  </div>

  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <div class="flex border-b border-gray-200">
      <button
        onclick={() => activeTab = 'ios'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'ios' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        {$i18n.t('profile.carddav.ios')}
      </button>
      <button
        onclick={() => activeTab = 'macos'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'macos' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        {$i18n.t('profile.carddav.macos')}
      </button>
      <button
        onclick={() => activeTab = 'thunderbird'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'thunderbird' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        {$i18n.t('profile.carddav.thunderbird')}
      </button>
    </div>

    <div class="p-4">
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

  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div class="flex items-start gap-2">
      <ExclamationTriangle class="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" strokeWidth="2" />
      <div>
        <h4 class="font-body font-semibold text-yellow-800">{$i18n.t('profile.carddav.important')}</h4>
        <p class="font-body text-sm text-yellow-700 mt-1">
          {@html $i18n.t('profile.carddav.importantNote')}
        </p>
      </div>
    </div>
  </div>
</div>
