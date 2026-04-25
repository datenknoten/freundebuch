<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';

const i18n = createI18n();

const mcpUrl = $derived(`${typeof window !== 'undefined' ? window.location.origin : ''}/mcp`);

let activeTab = $state<'claude-desktop' | 'claude-code' | 'other'>('claude-desktop');
let copied = $state(false);

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(mcpUrl);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  } catch {
    const input = document.createElement('input');
    input.value = mcpUrl;
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

const claudeDesktopConfig = $derived(
  JSON.stringify(
    {
      mcpServers: {
        freundebuch: {
          type: 'streamable-http',
          url: mcpUrl,
          headers: {
            Authorization: `Basic <base64(${$currentUser?.email ?? 'your@email.com'}:your-app-password)>`,
          },
        },
      },
    },
    null,
    2,
  ),
);
</script>

<div class="space-y-6">
  <!-- MCP Endpoint URL -->
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h4 class="font-body font-semibold text-blue-800 mb-2">{$i18n.t('profile.mcp.endpointUrl')}</h4>
    <div class="flex items-center gap-2">
      <code class="flex-1 bg-white border border-blue-200 rounded px-3 py-2 font-mono text-sm break-all">
        {mcpUrl}
      </code>
      <button
        onclick={copyUrl}
        class="shrink-0 bg-blue-600 text-white px-3 py-2 rounded font-body text-sm hover:bg-blue-700 transition-colors"
      >
        {copied ? $i18n.t('profile.mcp.copied') : $i18n.t('profile.mcp.copy')}
      </button>
    </div>
    <p class="font-body text-xs text-blue-600 mt-2">
      {$i18n.t('profile.mcp.useCredentials', { email: $currentUser?.email ?? 'your@email.com' })}
    </p>
  </div>

  <!-- App Password Reminder -->
  <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
    <ExclamationTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth="2" />
    <div>
      <p class="font-body text-sm text-amber-800">
        {$i18n.t('profile.mcp.appPasswordRequired')}
      </p>
      <a
        href="/profile/app-passwords"
        class="font-body text-sm text-amber-700 underline hover:text-amber-900 mt-1 inline-block"
      >
        {$i18n.t('profile.mcp.manageAppPasswords')}
      </a>
    </div>
  </div>

  <!-- Tabbed Setup Instructions -->
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <div class="flex border-b border-gray-200">
      <button
        onclick={() => activeTab = 'claude-desktop'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'claude-desktop' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        {$i18n.t('profile.mcp.tabs.claudeDesktop')}
      </button>
      <button
        onclick={() => activeTab = 'claude-code'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'claude-code' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        {$i18n.t('profile.mcp.tabs.claudeCode')}
      </button>
      <button
        onclick={() => activeTab = 'other'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'other' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        {$i18n.t('profile.mcp.tabs.other')}
      </button>
    </div>

    <div class="p-6 bg-white">
      {#if activeTab === 'claude-desktop'}
        <div class="space-y-4">
          <p class="font-body text-sm text-gray-700">
            {$i18n.t('profile.mcp.steps.claudeDesktop.intro')}
          </p>
          <ol class="list-decimal list-inside space-y-2 font-body text-sm text-gray-700">
            <li>{$i18n.t('profile.mcp.steps.claudeDesktop.step1')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeDesktop.step2')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeDesktop.step3')}</li>
          </ol>
          <pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-x-auto">{claudeDesktopConfig}</pre>
          <p class="font-body text-xs text-gray-500">
            {$i18n.t('profile.mcp.steps.claudeDesktop.note')}
          </p>
        </div>
      {:else if activeTab === 'claude-code'}
        <div class="space-y-4">
          <p class="font-body text-sm text-gray-700">
            {$i18n.t('profile.mcp.steps.claudeCode.intro')}
          </p>
          <pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-x-auto">claude mcp add freundebuch \
  --transport http \
  --url {mcpUrl} \
  --header "Authorization: Basic &lt;base64-credentials&gt;"</pre>
          <p class="font-body text-xs text-gray-500">
            {$i18n.t('profile.mcp.steps.claudeCode.note', { email: $currentUser?.email ?? 'your@email.com' })}
          </p>
        </div>
      {:else}
        <div class="space-y-4">
          <p class="font-body text-sm text-gray-700">
            {$i18n.t('profile.mcp.steps.other.intro')}
          </p>
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 font-body text-sm">
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.transport')}:</span> <code class="text-xs">Streamable HTTP</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.url')}:</span> <code class="text-xs">{mcpUrl}</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.auth')}:</span> <code class="text-xs">HTTP Basic Auth</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.username')}:</span> <code class="text-xs">{$currentUser?.email ?? 'your@email.com'}</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.password')}:</span> <code class="text-xs">{$i18n.t('profile.mcp.steps.other.passwordValue')}</code></div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
