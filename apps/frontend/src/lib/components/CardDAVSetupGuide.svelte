<script lang="ts">
import { currentUser } from '$lib/stores/auth';

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
    <h4 class="font-body font-semibold text-blue-800 mb-2">CardDAV Server URL</h4>
    <div class="flex items-center gap-2">
      <code class="flex-1 bg-white border border-blue-200 rounded px-3 py-2 font-mono text-sm break-all">
        {carddavUrl}
      </code>
      <button
        onclick={copyUrl}
        class="shrink-0 bg-blue-600 text-white px-3 py-2 rounded font-body text-sm hover:bg-blue-700 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
    <p class="font-body text-xs text-blue-600 mt-2">
      Use your email <strong>{$currentUser?.email}</strong> and an app password to sign in.
    </p>
  </div>

  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <div class="flex border-b border-gray-200">
      <button
        onclick={() => activeTab = 'ios'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'ios' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        iOS / iPadOS
      </button>
      <button
        onclick={() => activeTab = 'macos'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'macos' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        macOS
      </button>
      <button
        onclick={() => activeTab = 'thunderbird'}
        class="flex-1 px-4 py-3 font-body font-medium text-sm transition-colors {activeTab === 'thunderbird' ? 'bg-white text-forest border-b-2 border-forest' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
      >
        Thunderbird
      </button>
    </div>

    <div class="p-4">
      {#if activeTab === 'ios'}
        <ol class="list-decimal list-inside space-y-3 font-body text-gray-700">
          <li>Open <strong>Settings</strong> and tap <strong>Contacts</strong></li>
          <li>Tap <strong>Accounts</strong>, then <strong>Add Account</strong></li>
          <li>Select <strong>Other</strong> at the bottom</li>
          <li>Tap <strong>Add CardDAV Account</strong></li>
          <li>
            Enter your details:
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-gray-600">
              <li><strong>Server:</strong> {carddavUrl}</li>
              <li><strong>User Name:</strong> {$currentUser?.email}</li>
              <li><strong>Password:</strong> Your app password</li>
              <li><strong>Description:</strong> Freundebuch</li>
            </ul>
          </li>
          <li>Tap <strong>Next</strong> to verify and save</li>
        </ol>
      {:else if activeTab === 'macos'}
        <ol class="list-decimal list-inside space-y-3 font-body text-gray-700">
          <li>Open <strong>System Settings</strong> (or System Preferences)</li>
          <li>Click <strong>Internet Accounts</strong></li>
          <li>Click <strong>Add Account</strong>, then select <strong>Other Contacts Account</strong></li>
          <li>Select <strong>CardDAV</strong> as the account type</li>
          <li>
            Enter your details:
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-gray-600">
              <li><strong>Account Type:</strong> Manual</li>
              <li><strong>User Name:</strong> {$currentUser?.email}</li>
              <li><strong>Password:</strong> Your app password</li>
              <li><strong>Server Address:</strong> {carddavUrl}</li>
            </ul>
          </li>
          <li>Click <strong>Sign In</strong></li>
        </ol>
      {:else if activeTab === 'thunderbird'}
        <ol class="list-decimal list-inside space-y-3 font-body text-gray-700">
          <li>Install the <strong>CardBook</strong> add-on from Thunderbird Add-ons</li>
          <li>Open <strong>CardBook</strong> from the Thunderbird menu</li>
          <li>Click <strong>Address Book</strong> &rarr; <strong>New Address Book</strong></li>
          <li>Select <strong>Remote</strong> and click <strong>Next</strong></li>
          <li>Select <strong>CardDAV</strong> and click <strong>Next</strong></li>
          <li>
            Enter your details:
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-sm text-gray-600">
              <li><strong>URL:</strong> {carddavUrl}</li>
              <li><strong>User:</strong> {$currentUser?.email}</li>
              <li><strong>Password:</strong> Your app password</li>
            </ul>
          </li>
          <li>Click <strong>Validate</strong> to verify the connection</li>
          <li>Select the address book and complete the setup</li>
        </ol>
      {/if}
    </div>
  </div>

  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div class="flex items-start gap-2">
      <svg class="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <h4 class="font-body font-semibold text-yellow-800">Important</h4>
        <p class="font-body text-sm text-yellow-700 mt-1">
          Always use an <strong>app password</strong> instead of your regular account password.
          App passwords can be revoked individually without changing your main password.
        </p>
      </div>
    </div>
  </div>
</div>
