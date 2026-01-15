<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { isAuthenticated } from '$lib/stores/auth';
import { currentFriend, friendListFilter } from '$lib/stores/friends';
import { isSearchOpen, search } from '$lib/stores/search';
import { get } from 'svelte/store';
import {
  getIndexFromHint,
  ITEMS_PER_GROUP,
  isModalOpen,
  isOpenModeActive,
  openModePrefix,
  visibleFriendIds,
} from '$lib/stores/ui';

let showHelp = $state(false);
let pendingKey = $state<string | null>(null);

// Clear pending key (used when action completes or Escape is pressed)
function clearPending() {
  pendingKey = null;
  isOpenModeActive.set(false);
  openModePrefix.set(null);
}

function handleKeydown(e: KeyboardEvent) {
  // Handle Cmd/Ctrl+K to open global search (works even in inputs)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if ($isAuthenticated) {
      search.toggle();
    }
    return;
  }

  // Don't handle other shortcuts if global search is open
  if ($isSearchOpen) {
    return;
  }

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

  // When a modal/form is open, only allow Escape to close it
  if ($isModalOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      isModalOpen.set(false);
      // Dispatch event to close any open forms
      window.dispatchEvent(new CustomEvent('shortcut:close-modal'));
    }
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
      case 'f': {
        // Restore filter state from store when navigating to friends
        const filterState = get(friendListFilter);
        const params = friendListFilter.buildSearchParams(filterState);
        const queryString = params.toString();
        goto(queryString ? `/friends?${queryString}` : '/friends');
        break;
      }
      case 'h':
        goto('/');
        break;
      case 'p':
        goto('/profile');
        break;
      case 'c':
        goto('/circles');
        break;
    }
    return;
  }

  // Handle two-key sequences (a+...) for adding details - only on friend detail page
  if (pendingKey === 'a') {
    clearPending();

    // Only work on friend detail pages
    if (!$currentFriend || !$page.url.pathname.match(/^\/friends\/[^/]+$/)) {
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case 'p':
        window.dispatchEvent(new CustomEvent('shortcut:add-phone'));
        break;
      case 'e':
        window.dispatchEvent(new CustomEvent('shortcut:add-email'));
        break;
      case 'a':
        window.dispatchEvent(new CustomEvent('shortcut:add-address'));
        break;
      case 'u':
        window.dispatchEvent(new CustomEvent('shortcut:add-url'));
        break;
      case 'd':
        window.dispatchEvent(new CustomEvent('shortcut:add-date'));
        break;
      case 's':
        window.dispatchEvent(new CustomEvent('shortcut:add-social'));
        break;
      case 'r':
        window.dispatchEvent(new CustomEvent('shortcut:add-relationship'));
        break;
      case 'c':
        window.dispatchEvent(new CustomEvent('shortcut:add-circle'));
        break;
    }
    return;
  }

  // Handle two/three-key sequences (o+...) for opening friends from list
  // Supports: o+1-9 for items 1-9, o+a+1-9 for items 10-18, o+b+1-9 for items 19-27, etc.
  if (pendingKey === 'o') {
    const friendIds = $visibleFriendIds;
    const currentPrefix = $openModePrefix;
    const keyNum = parseInt(e.key, 10);
    const keyLower = e.key.toLowerCase();

    // If we already have a letter prefix, we're waiting for a number
    if (currentPrefix) {
      if (keyNum >= 1 && keyNum <= 9) {
        e.preventDefault();
        const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
        if (index >= 0 && index < friendIds.length) {
          clearPending();
          goto(`/friends/${friendIds[index]}`);
        } else {
          // Index out of range, clear pending state
          clearPending();
        }
      } else {
        // Invalid key after letter prefix, clear pending state
        clearPending();
      }
      return;
    }

    // No prefix yet - check if it's a number (1-9) or letter (a-z)
    if (keyNum >= 1 && keyNum <= 9) {
      // Direct number: open item 1-9
      e.preventDefault();
      const index = keyNum - 1;
      if (index < friendIds.length) {
        clearPending();
        goto(`/friends/${friendIds[index]}`);
      }
      return;
    }

    // Check if it's a letter for extended navigation
    if (keyLower >= 'a' && keyLower <= 'z') {
      // Calculate the starting index for this letter group
      const letterIndex = keyLower.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
      const groupStartIndex = (letterIndex + 1) * ITEMS_PER_GROUP;

      // Only accept the letter if there are items in this group
      if (groupStartIndex < friendIds.length) {
        e.preventDefault();
        openModePrefix.set(keyLower);
        return;
      }
    }

    // Invalid key, clear pending state
    clearPending();
    return;
  }

  // Start two-key sequence (no timeout - panel stays until action or Escape)
  if (e.key === 'g') {
    e.preventDefault();
    pendingKey = 'g';
    return;
  }

  // Start add detail sequence (only on friend detail page)
  if (e.key === 'a' && $currentFriend && $page.url.pathname.match(/^\/friends\/[^/]+$/)) {
    e.preventDefault();
    pendingKey = 'a';
    return;
  }

  // Start open friend sequence (only on friends list page)
  if (e.key === 'o' && $page.url.pathname === '/friends') {
    e.preventDefault();
    pendingKey = 'o';
    isOpenModeActive.set(true);
    return;
  }

  // Single key shortcuts
  switch (e.key) {
    case 'n':
      e.preventDefault();
      goto('/friends/new');
      break;

    case 'e':
      // Edit current friend if on friend detail page
      if ($currentFriend && $page.url.pathname.match(/^\/friends\/[^/]+$/)) {
        e.preventDefault();
        goto(`/friends/${$currentFriend.id}/edit`);
      }
      break;

    case '/': {
      e.preventDefault();
      // Focus search input if it exists, otherwise go to friends
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
      if (searchInput) {
        searchInput.focus();
      } else {
        goto('/friends');
      }
      break;
    }

    case '<':
    case ',':
      // Previous page (Shift+Comma = <)
      if (e.shiftKey && $page.url.pathname === '/friends') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:previous-page'));
      }
      break;

    case '>':
    case '.':
      // Next page (Shift+Period = >)
      if (e.shiftKey && $page.url.pathname === '/friends') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:next-page'));
      }
      break;
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
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
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
                <span class="text-gray-700">Go to Friends</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
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
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Go to Circles</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
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
                <span class="text-gray-700">Global Search</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">Cmd</kbd>
                  <span class="text-gray-400">+</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">K</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">New Friend</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Edit Friend</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Focus Search</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">/</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Friend (1-9)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Friend (10+)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Previous Page</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">&lt;</kbd>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Next Page</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">&gt;</kbd>
              </div>
            </div>
          </div>

          <!-- Add Details (on friend page) -->
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Add Details <span class="text-xs font-normal normal-case">(on friend page)</span>
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Phone</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">p</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Email</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Address</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add URL</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">u</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Date</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">d</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Social Profile</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">s</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Relationship</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">r</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Circle</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
                </div>
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

<!-- Pending key options panel -->
{#if pendingKey === 'g'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">Go to...</span>
      <span class="text-xs text-gray-500 ml-2">Press key or Esc to cancel</span>
    </div>
    <div class="p-2 space-y-1 font-body text-sm">
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Home</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">h</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Friends</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">f</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Profile</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">p</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Circles</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">c</kbd>
      </div>
    </div>
  </div>
{:else if pendingKey === 'a'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">Add...</span>
      <span class="text-xs text-gray-500 ml-2">Press key or Esc to cancel</span>
    </div>
    <div class="p-2 space-y-1 font-body text-sm">
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Phone</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">p</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Email</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">e</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Address</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">a</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">URL</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">u</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Date</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">d</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Social Profile</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">s</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Relationship</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">r</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Circle</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">c</kbd>
      </div>
    </div>
  </div>
{:else if pendingKey === 'o'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">
        Open friend{$openModePrefix ? ` (${$openModePrefix}...)` : '...'}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {#if $openModePrefix}
          Press 1-9 or Esc to cancel
        {:else}
          Press 1-9, a-z, or Esc to cancel
        {/if}
      </span>
    </div>
    <div class="p-3 font-body text-sm text-gray-600">
      {#if $openModePrefix}
        Press the number to complete: {$openModePrefix}1, {$openModePrefix}2, ...
      {:else}
        Press the key shown on a friend to open it
      {/if}
    </div>
  </div>
{/if}
