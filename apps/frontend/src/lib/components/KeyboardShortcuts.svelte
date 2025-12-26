<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { isAuthenticated } from '$lib/stores/auth';
import { currentContact } from '$lib/stores/contacts';

let showHelp = $state(false);
let pendingKey = $state<string | null>(null);
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

// Clear pending key after a delay
function clearPending() {
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  pendingKey = null;
}

function handleKeydown(e: KeyboardEvent) {
  // Ignore if user is typing in an input, textarea, or contenteditable
  const target = e.target as HTMLElement;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  ) {
    // Allow Escape to blur inputs
    if (e.key === 'Escape') {
      target.blur();
    }
    return;
  }

  // Don't handle shortcuts if not authenticated (except ?)
  if (!$isAuthenticated && e.key !== '?') {
    return;
  }

  // Handle ? for help (works even when not authenticated to show "login first")
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    showHelp = !showHelp;
    return;
  }

  // Handle Escape to close help
  if (e.key === 'Escape') {
    if (showHelp) {
      e.preventDefault();
      showHelp = false;
    }
    clearPending();
    return;
  }

  // Handle two-key sequences (g+...)
  if (pendingKey === 'g') {
    clearPending();
    e.preventDefault();

    switch (e.key) {
      case 'c':
        goto('/contacts');
        break;
      case 'h':
        goto('/');
        break;
      case 'p':
        goto('/profile');
        break;
    }
    return;
  }

  // Start two-key sequence
  if (e.key === 'g') {
    e.preventDefault();
    pendingKey = 'g';
    pendingTimeout = setTimeout(clearPending, 1000);
    return;
  }

  // Single key shortcuts
  switch (e.key) {
    case 'n':
      e.preventDefault();
      goto('/contacts/new');
      break;

    case 'e':
      // Edit current contact if on contact detail page
      if ($currentContact && $page.url.pathname.match(/^\/contacts\/[^/]+$/)) {
        e.preventDefault();
        goto(`/contacts/${$currentContact.id}/edit`);
      }
      break;

    case '/': {
      e.preventDefault();
      // Focus search input if it exists, otherwise go to contacts
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
      if (searchInput) {
        searchInput.focus();
      } else {
        goto('/contacts');
      }
      break;
    }
  }
}

function closeHelp() {
  showHelp = false;
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showHelp}
  <!-- Help overlay -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    onclick={closeHelp}
    onkeydown={(e) => e.key === 'Escape' && closeHelp()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    tabindex="-1"
  >
    <div
      class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
      onkeydown={() => {}}
      role="document"
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" class="text-2xl font-heading text-forest">
            Keyboard Shortcuts
          </h2>
          <button
            onclick={closeHelp}
            class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-6 font-body">
          <!-- Navigation -->
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Navigation
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Go to Home</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">h</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Go to Contacts</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Go to Profile</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">p</kbd>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Actions
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">New Contact</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Edit Contact</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Focus Search</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">/</kbd>
              </div>
            </div>
          </div>

          <!-- General -->
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              General
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Show this help</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">?</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Close / Cancel</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-200">
          <p class="text-sm text-gray-500 font-body">
            Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> anytime to show this help.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Pending key indicator -->
{#if pendingKey}
  <div class="fixed bottom-6 left-6 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg font-mono text-sm z-50">
    {pendingKey} ...
  </div>
{/if}
