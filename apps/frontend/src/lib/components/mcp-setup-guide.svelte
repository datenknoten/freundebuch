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

const mcpUrl = $derived(`${typeof window !== 'undefined' ? window.location.origin : ''}/mcp`);

type McpTab = 'claude-ai' | 'claude-desktop' | 'claude-code' | 'other';

let activeTab = $state<McpTab>('claude-ai');
let copied = $state(false);

const tabs = $derived([
  { id: 'claude-ai' as const, label: $i18n.t('profile.mcp.tabs.claudeAi') },
  { id: 'claude-desktop' as const, label: $i18n.t('profile.mcp.tabs.claudeDesktop') },
  { id: 'claude-code' as const, label: $i18n.t('profile.mcp.tabs.claudeCode') },
  { id: 'other' as const, label: $i18n.t('profile.mcp.tabs.other') },
]);

function flagCopied() {
  copied = true;
  setTimeout(() => {
    copied = false;
  }, TRANSIENT_FEEDBACK_MS);
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(mcpUrl);
    flagCopied();
  } catch {
    const input = document.createElement('input');
    input.value = mcpUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    flagCopied();
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
  <AlertBanner variant="info" title={$i18n.t('profile.mcp.endpointUrl')}>
    <div class="flex items-center gap-2 mt-2">
      <code class="flex-1 {codeClasses.inline} break-all">
        {mcpUrl}
      </code>
      <Button size="sm" onclick={copyUrl} class="shrink-0">
        {copied ? $i18n.t('profile.mcp.copied') : $i18n.t('profile.mcp.copy')}
      </Button>
    </div>
    <p class="text-xs mt-2">
      {$i18n.t('profile.mcp.useCredentials', { email: $currentUser?.email ?? 'your@email.com' })}
    </p>
  </AlertBanner>

  <!-- App Password Reminder -->
  <AlertBanner variant="warning">
    <div class="flex items-start gap-3">
      <ExclamationTriangle class="w-5 h-5 shrink-0 mt-0.5" strokeWidth="2" />
      <div>
        <p>
          {$i18n.t('profile.mcp.appPasswordRequired')}
        </p>
        <a
          href="/profile/app-passwords"
          class="underline hover:text-yellow-900 mt-1 inline-block"
        >
          {$i18n.t('profile.mcp.manageAppPasswords')}
        </a>
      </div>
    </div>
  </AlertBanner>

  <!-- Tabbed Setup Instructions -->
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <TabNav {tabs} active={activeTab} onselect={(id) => (activeTab = id)} />

    <div
      id="tabpanel-{activeTab}"
      role="tabpanel"
      aria-labelledby="tab-{activeTab}"
      tabindex="-1"
      class="p-6 bg-white"
    >
      {#if activeTab === 'claude-ai'}
        <div class="space-y-4">
          <p class="font-body text-sm text-gray-700">
            {$i18n.t('profile.mcp.steps.claudeAi.intro')}
          </p>
          <ol class="list-decimal list-inside space-y-2 font-body text-sm text-gray-700">
            <li>{$i18n.t('profile.mcp.steps.claudeAi.step1')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeAi.step2')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeAi.step3')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeAi.step4')}</li>
          </ol>
          <AlertBanner variant="success">
            {$i18n.t('profile.mcp.steps.claudeAi.note')}
          </AlertBanner>
        </div>
      {:else if activeTab === 'claude-desktop'}
        <div class="space-y-4">
          <p class="font-body text-sm text-gray-700">
            {$i18n.t('profile.mcp.steps.claudeDesktop.intro')}
          </p>
          <ol class="list-decimal list-inside space-y-2 font-body text-sm text-gray-700">
            <li>{$i18n.t('profile.mcp.steps.claudeDesktop.step1')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeDesktop.step2')}</li>
            <li>{$i18n.t('profile.mcp.steps.claudeDesktop.step3')}</li>
          </ol>
          <pre class={codeClasses.block}>{claudeDesktopConfig}</pre>
          <p class="font-body text-xs text-gray-500">
            {$i18n.t('profile.mcp.steps.claudeDesktop.note')}
          </p>
        </div>
      {:else if activeTab === 'claude-code'}
        <div class="space-y-4">
          <p class="font-body text-sm text-gray-700">
            {$i18n.t('profile.mcp.steps.claudeCode.intro')}
          </p>
          <pre class={codeClasses.block}>claude mcp add freundebuch \
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
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.transport')}:</span> <code class={codeClasses.inline}>Streamable HTTP</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.url')}:</span> <code class="{codeClasses.inline} break-all">{mcpUrl}</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.auth')}:</span> <code class={codeClasses.inline}>HTTP Basic Auth</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.username')}:</span> <code class="{codeClasses.inline} break-all">{$currentUser?.email ?? 'your@email.com'}</code></div>
            <div><span class="font-semibold text-gray-700">{$i18n.t('profile.mcp.steps.other.password')}:</span> <code class={codeClasses.inline}>{$i18n.t('profile.mcp.steps.other.passwordValue')}</code></div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
