<script lang="ts">
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { isAuthenticated } from '$lib/stores/auth';
import { currentFriend, friendListFilter } from '$lib/stores/friends';
import { isSearchOpen, search } from '$lib/stores/search';
import {
  deleteCircleModePrefix,
  editCircleModePrefix,
  FILTER_CATEGORY_KEYS,
  FILTER_CATEGORY_LABELS,
  filterModeCategory,
  filterModePrefix,
  getIndexFromHint,
  ITEMS_PER_GROUP,
  isDeleteCircleModeActive,
  isEditCircleModeActive,
  isFilterModeActive,
  isModalOpen,
  isOpenCollectiveModeActive,
  isOpenEncounterModeActive,
  isOpenMemberModeActive,
  isOpenModeActive,
  openCollectiveModePrefix,
  openEncounterModePrefix,
  openMemberModePrefix,
  openModePrefix,
  visibleCircleIds,
  visibleCollectiveIds,
  visibleEncounterIds,
  visibleFriendIds,
  visibleMemberContactIds,
} from '$lib/stores/ui';

let showHelp = $state(false);
let pendingKey = $state<string | null>(null);

// Context-sensitive help: determine which page we're on
let isOnCirclesPage = $derived($page.url.pathname === '/circles');
let isOnFriendsListPage = $derived($page.url.pathname === '/friends');
let isOnEncountersListPage = $derived($page.url.pathname === '/encounters');
let isOnCollectivesListPage = $derived($page.url.pathname === '/collectives');
let isOnFriendDetailPage = $derived(
  $page.url.pathname.match(/^\/friends\/[^/]+$/) && !$page.url.pathname.endsWith('/new'),
);
let isOnCollectiveDetailPage = $derived(
  $page.url.pathname.match(/^\/collectives\/[^/]+$/) && !$page.url.pathname.endsWith('/new'),
);

// Clear pending key (used when action completes or Escape is pressed)
function clearPending() {
  pendingKey = null;
  isOpenModeActive.set(false);
  openModePrefix.set(null);
  isFilterModeActive.set(false);
  filterModeCategory.set(null);
  filterModePrefix.set(null);
  isEditCircleModeActive.set(false);
  editCircleModePrefix.set(null);
  isDeleteCircleModeActive.set(false);
  deleteCircleModePrefix.set(null);
  isOpenEncounterModeActive.set(false);
  openEncounterModePrefix.set(null);
  isOpenCollectiveModeActive.set(false);
  openCollectiveModePrefix.set(null);
  isOpenMemberModeActive.set(false);
  openMemberModePrefix.set(null);
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
  // Requires Shift to be pressed to distinguish from '/' which focuses search
  if (e.shiftKey && (e.key === '?' || e.key === '/')) {
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
      case 'e':
        goto('/encounters');
        break;
      case 'o':
        goto('/collectives');
        break;
    }
    return;
  }

  // Handle two-key sequences (n+...) for creating new items
  if (pendingKey === 'n') {
    clearPending();
    e.preventDefault();

    switch (e.key) {
      case 'f':
        goto('/friends/new');
        break;
      case 'c':
        // If on circles page, open the modal; otherwise navigate there
        if ($page.url.pathname === '/circles') {
          window.dispatchEvent(new CustomEvent('shortcut:new-circle'));
        } else {
          goto('/circles');
        }
        break;
      case 'e':
        goto('/encounters/new');
        break;
      case 'o':
        goto('/collectives/new');
        break;
    }
    return;
  }

  // Handle two-key sequences (a+...) for adding details - on friend or collective detail page
  if (pendingKey === 'a') {
    clearPending();

    const isOnFriend = $currentFriend && $page.url.pathname.match(/^\/friends\/[^/]+$/);
    const isOnCollective =
      $page.url.pathname.match(/^\/collectives\/[^/]+$/) && !$page.url.pathname.endsWith('/new');

    if (!isOnFriend && !isOnCollective) {
      return;
    }

    e.preventDefault();

    if (isOnCollective) {
      // Collective detail shortcuts
      switch (e.key) {
        case 'p':
          window.dispatchEvent(new CustomEvent('shortcut:collective-add-phone'));
          break;
        case 'e':
          window.dispatchEvent(new CustomEvent('shortcut:collective-add-email'));
          break;
        case 'a':
          window.dispatchEvent(new CustomEvent('shortcut:collective-add-address'));
          break;
        case 'u':
          window.dispatchEvent(new CustomEvent('shortcut:collective-add-url'));
          break;
        case 'c':
          window.dispatchEvent(new CustomEvent('shortcut:collective-add-circle'));
          break;
        case 'm':
          window.dispatchEvent(new CustomEvent('shortcut:collective-add-member'));
          break;
      }
    } else {
      // Friend detail shortcuts
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
        case 'w':
          window.dispatchEvent(new CustomEvent('shortcut:add-professional'));
          break;
      }
    }
    return;
  }

  // Handle two/three-key sequences (o+...) for opening friends, encounters, collectives, or members
  // Supports: o+1-9 for items 1-9, o+a+1-9 for items 10-18, o+b+1-9 for items 19-27, etc.
  if (pendingKey === 'o') {
    // Determine which page we're on
    const isOnFriends = $page.url.pathname === '/friends';
    const isOnEncounters = $page.url.pathname === '/encounters';
    const isOnCollectives = $page.url.pathname === '/collectives';
    const isOnCollectiveDetail =
      $page.url.pathname.match(/^\/collectives\/[^/]+$/) && !$page.url.pathname.endsWith('/new');

    const itemIds = isOnCollectiveDetail
      ? $visibleMemberContactIds
      : isOnCollectives
        ? $visibleCollectiveIds
        : isOnEncounters
          ? $visibleEncounterIds
          : $visibleFriendIds;
    const currentPrefix = isOnCollectiveDetail
      ? $openMemberModePrefix
      : isOnCollectives
        ? $openCollectiveModePrefix
        : isOnEncounters
          ? $openEncounterModePrefix
          : $openModePrefix;
    // Members navigate to /friends/{contactId}, others navigate to their own base path
    const basePath = isOnCollectiveDetail
      ? '/friends'
      : isOnCollectives
        ? '/collectives'
        : isOnEncounters
          ? '/encounters'
          : '/friends';
    const keyNum = parseInt(e.key, 10);
    const keyLower = e.key.toLowerCase();

    // If we already have a letter prefix, we're waiting for a number
    if (currentPrefix) {
      if (keyNum >= 1 && keyNum <= 9) {
        e.preventDefault();
        const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
        if (index >= 0 && index < itemIds.length) {
          clearPending();
          goto(`${basePath}/${itemIds[index]}`);
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
      if (index < itemIds.length) {
        clearPending();
        goto(`${basePath}/${itemIds[index]}`);
      }
      return;
    }

    // Check if it's a letter for extended navigation
    if (keyLower >= 'a' && keyLower <= 'z') {
      // Calculate the starting index for this letter group
      const letterIndex = keyLower.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
      const groupStartIndex = (letterIndex + 1) * ITEMS_PER_GROUP;

      // Only accept the letter if there are items in this group
      if (groupStartIndex < itemIds.length) {
        e.preventDefault();
        if (isOnCollectiveDetail) {
          openMemberModePrefix.set(keyLower);
        } else if (isOnCollectives) {
          openCollectiveModePrefix.set(keyLower);
        } else if (isOnEncounters) {
          openEncounterModePrefix.set(keyLower);
        } else {
          openModePrefix.set(keyLower);
        }
        return;
      }
    }

    // Invalid key, clear pending state
    clearPending();
    return;
  }

  // Handle two-key sequences (f+...) for filter selection - only on friends page
  if (pendingKey === 'f') {
    const keyLower = e.key.toLowerCase();
    const category = FILTER_CATEGORY_KEYS[keyLower];

    // Handle 'x' to clear all filters
    if (keyLower === 'x') {
      e.preventDefault();
      clearPending();
      window.dispatchEvent(new CustomEvent('shortcut:clear-filters'));
      return;
    }

    // Handle category selection
    if (category) {
      e.preventDefault();
      isFilterModeActive.set(true);
      filterModeCategory.set(category);
      window.dispatchEvent(new CustomEvent('shortcut:filter-category', { detail: { category } }));
      // Don't clear pending - stay in filter mode for value selection
      return;
    }

    // If in filter mode (category selected), handle number/letter selection
    if ($isFilterModeActive && $filterModeCategory) {
      const keyNum = parseInt(e.key, 10);
      const currentPrefix = $filterModePrefix;

      // If we already have a letter prefix, we're waiting for a number
      if (currentPrefix) {
        if (keyNum >= 1 && keyNum <= 9) {
          e.preventDefault();
          const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
          if (index >= 0) {
            window.dispatchEvent(
              new CustomEvent('shortcut:filter-toggle', {
                detail: { category: $filterModeCategory, index },
              }),
            );
          }
          // Clear the prefix after selection (but stay in filter mode)
          filterModePrefix.set(null);
        } else {
          // Invalid key after letter prefix, clear prefix
          filterModePrefix.set(null);
        }
        return;
      }

      // No prefix yet - check if it's a number (1-9) or letter (a-z)
      if (keyNum >= 1 && keyNum <= 9) {
        // Direct number: toggle item 1-9
        e.preventDefault();
        const index = keyNum - 1;
        window.dispatchEvent(
          new CustomEvent('shortcut:filter-toggle', {
            detail: { category: $filterModeCategory, index },
          }),
        );
        return;
      }

      // Check if it's a letter for extended navigation (not a category key)
      // Must be single character to avoid capturing modifier keys like "shift"
      if (
        keyLower.length === 1 &&
        keyLower >= 'a' &&
        keyLower <= 'z' &&
        !FILTER_CATEGORY_KEYS[keyLower]
      ) {
        e.preventDefault();
        filterModePrefix.set(keyLower);
        return;
      }
    }

    // Invalid key, clear pending state
    clearPending();
    return;
  }

  // Handle two/three-key sequences (e+...) for editing circles - only on circles page
  if (pendingKey === 'e' && $page.url.pathname === '/circles') {
    const circleIds = $visibleCircleIds;
    const currentPrefix = $editCircleModePrefix;
    const keyNum = parseInt(e.key, 10);
    const keyLower = e.key.toLowerCase();

    // If we already have a letter prefix, we're waiting for a number
    if (currentPrefix) {
      if (keyNum >= 1 && keyNum <= 9) {
        e.preventDefault();
        const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
        if (index >= 0 && index < circleIds.length) {
          clearPending();
          window.dispatchEvent(
            new CustomEvent('shortcut:edit-circle', { detail: { circleId: circleIds[index] } }),
          );
        } else {
          clearPending();
        }
      } else {
        clearPending();
      }
      return;
    }

    // No prefix yet - check if it's a number (1-9) or letter (a-z)
    if (keyNum >= 1 && keyNum <= 9) {
      e.preventDefault();
      const index = keyNum - 1;
      if (index < circleIds.length) {
        clearPending();
        window.dispatchEvent(
          new CustomEvent('shortcut:edit-circle', { detail: { circleId: circleIds[index] } }),
        );
      }
      return;
    }

    // Check if it's a letter for extended navigation
    if (keyLower >= 'a' && keyLower <= 'z') {
      const letterIndex = keyLower.charCodeAt(0) - 97;
      const groupStartIndex = (letterIndex + 1) * ITEMS_PER_GROUP;

      if (groupStartIndex < circleIds.length) {
        e.preventDefault();
        editCircleModePrefix.set(keyLower);
        return;
      }
    }

    clearPending();
    return;
  }

  // Handle two/three-key sequences (d+...) for deleting circles - only on circles page
  if (pendingKey === 'd' && $page.url.pathname === '/circles') {
    const circleIds = $visibleCircleIds;
    const currentPrefix = $deleteCircleModePrefix;
    const keyNum = parseInt(e.key, 10);
    const keyLower = e.key.toLowerCase();

    // If we already have a letter prefix, we're waiting for a number
    if (currentPrefix) {
      if (keyNum >= 1 && keyNum <= 9) {
        e.preventDefault();
        const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
        if (index >= 0 && index < circleIds.length) {
          clearPending();
          window.dispatchEvent(
            new CustomEvent('shortcut:delete-circle', { detail: { circleId: circleIds[index] } }),
          );
        } else {
          clearPending();
        }
      } else {
        clearPending();
      }
      return;
    }

    // No prefix yet - check if it's a number (1-9) or letter (a-z)
    if (keyNum >= 1 && keyNum <= 9) {
      e.preventDefault();
      const index = keyNum - 1;
      if (index < circleIds.length) {
        clearPending();
        window.dispatchEvent(
          new CustomEvent('shortcut:delete-circle', { detail: { circleId: circleIds[index] } }),
        );
      }
      return;
    }

    // Check if it's a letter for extended navigation
    if (keyLower >= 'a' && keyLower <= 'z') {
      const letterIndex = keyLower.charCodeAt(0) - 97;
      const groupStartIndex = (letterIndex + 1) * ITEMS_PER_GROUP;

      if (groupStartIndex < circleIds.length) {
        e.preventDefault();
        deleteCircleModePrefix.set(keyLower);
        return;
      }
    }

    clearPending();
    return;
  }

  // Start two-key sequence (no timeout - panel stays until action or Escape)
  if (e.key === 'g') {
    e.preventDefault();
    pendingKey = 'g';
    return;
  }

  // Start new item sequence
  if (e.key === 'n') {
    e.preventDefault();
    pendingKey = 'n';
    return;
  }

  // Start add detail sequence (on friend or collective detail page)
  if (
    e.key === 'a' &&
    (($currentFriend && $page.url.pathname.match(/^\/friends\/[^/]+$/)) ||
      ($page.url.pathname.match(/^\/collectives\/[^/]+$/) && !$page.url.pathname.endsWith('/new')))
  ) {
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

  // Start open encounter sequence (only on encounters list page)
  if (e.key === 'o' && $page.url.pathname === '/encounters') {
    e.preventDefault();
    pendingKey = 'o';
    isOpenEncounterModeActive.set(true);
    return;
  }

  // Start open collective sequence (only on collectives list page)
  if (e.key === 'o' && $page.url.pathname === '/collectives') {
    e.preventDefault();
    pendingKey = 'o';
    isOpenCollectiveModeActive.set(true);
    return;
  }

  // Start open member sequence (only on collective detail page)
  if (
    e.key === 'o' &&
    $page.url.pathname.match(/^\/collectives\/[^/]+$/) &&
    !$page.url.pathname.endsWith('/new')
  ) {
    e.preventDefault();
    pendingKey = 'o';
    isOpenMemberModeActive.set(true);
    return;
  }

  // Start filter sequence (only on friends list page)
  if (e.key === 'f' && $page.url.pathname === '/friends') {
    e.preventDefault();
    pendingKey = 'f';
    return;
  }

  // Start edit circle sequence (only on circles page)
  if (e.key === 'e' && $page.url.pathname === '/circles') {
    e.preventDefault();
    pendingKey = 'e';
    isEditCircleModeActive.set(true);
    return;
  }

  // Start delete circle sequence (only on circles page)
  if (e.key === 'd' && $page.url.pathname === '/circles') {
    e.preventDefault();
    pendingKey = 'd';
    isDeleteCircleModeActive.set(true);
    return;
  }

  // Single key shortcuts
  switch (e.key) {
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
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Go to Encounters</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Go to Collectives</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">g</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                </div>
              </div>
            </div>
          </div>

          <!-- Global Actions (always visible) -->
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
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">New Circle</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">New Encounter</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">New Collective</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">n</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                </div>
              </div>
              {#if isOnFriendDetailPage}
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Edit Friend</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
                </div>
              {/if}
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Focus Search</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">/</kbd>
              </div>
            </div>
          </div>

          <!-- Friends List Actions (only on /friends) -->
          {#if isOnFriendsListPage}
            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Friends List
              </h3>
              <div class="space-y-2">
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

            <!-- Filters (only on friends list) -->
            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Filters
              </h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Filter by Country</span>
                  <div class="flex gap-1">
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
                    <span class="text-gray-400">then</span>
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Filter by City</span>
                  <div class="flex gap-1">
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
                    <span class="text-gray-400">then</span>
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">i</kbd>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Filter by Organization</span>
                  <div class="flex gap-1">
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
                    <span class="text-gray-400">then</span>
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Clear all filters</span>
                  <div class="flex gap-1">
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">f</kbd>
                    <span class="text-gray-400">then</span>
                    <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">x</kbd>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Collective Detail (only on collective detail page) -->
          {#if isOnCollectiveDetailPage}
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Collective Detail
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Member (1-9)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Member (10+)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Add Details
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
                <span class="text-gray-700">Add Circle</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">c</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Member</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">m</kbd>
                </div>
              </div>
            </div>
          </div>
          {/if}

          <!-- Add Details (only on friend detail page) -->
          {#if isOnFriendDetailPage}
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Add Details
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
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Add Work Experience</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">w</kbd>
                </div>
              </div>
            </div>
          </div>
          {/if}

          <!-- Circles (only on circles page) -->
          {#if isOnCirclesPage}
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Circles
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Edit Circle (1-9)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Edit Circle (10+)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">e</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Delete Circle (1-9)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">d</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Delete Circle (10+)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">d</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
            </div>
          </div>
          {/if}

          <!-- Encounters List (only on /encounters) -->
          {#if isOnEncountersListPage}
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Encounters List
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Encounter (1-9)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Encounter (10+)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
            </div>
          </div>
          {/if}

          <!-- Collectives List (only on /collectives) -->
          {#if isOnCollectivesListPage}
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Collectives List
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Collective (1-9)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Open Collective (10+)</span>
                <div class="flex gap-1">
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">o</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">a-z</kbd>
                  <span class="text-gray-400">then</span>
                  <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">1-9</kbd>
                </div>
              </div>
            </div>
          </div>
          {/if}

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
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Encounters</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">e</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Collectives</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">o</kbd>
      </div>
    </div>
  </div>
{:else if pendingKey === 'n'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">New...</span>
      <span class="text-xs text-gray-500 ml-2">Press key or Esc to cancel</span>
    </div>
    <div class="p-2 space-y-1 font-body text-sm">
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Friend</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">f</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Circle</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">c</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Encounter</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">e</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Collective</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">o</kbd>
      </div>
    </div>
  </div>
{:else if pendingKey === 'a' && isOnCollectiveDetailPage}
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
        <span class="text-gray-700">Circle</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">c</kbd>
      </div>
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Member</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">m</kbd>
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
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">Work Experience</span>
        <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">w</kbd>
      </div>
    </div>
  </div>
{:else if pendingKey === 'o' && $page.url.pathname === '/friends'}
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
{:else if pendingKey === 'o' && $page.url.pathname === '/encounters'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">
        Open encounter{$openEncounterModePrefix ? ` (${$openEncounterModePrefix}...)` : '...'}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {#if $openEncounterModePrefix}
          Press 1-9 or Esc to cancel
        {:else}
          Press 1-9, a-z, or Esc to cancel
        {/if}
      </span>
    </div>
    <div class="p-3 font-body text-sm text-gray-600">
      {#if $openEncounterModePrefix}
        Press the number to complete: {$openEncounterModePrefix}1, {$openEncounterModePrefix}2, ...
      {:else}
        Press the key shown on an encounter to open it
      {/if}
    </div>
  </div>
{:else if pendingKey === 'o' && isOnCollectiveDetailPage}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">
        Open member{$openMemberModePrefix ? ` (${$openMemberModePrefix}...)` : '...'}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {#if $openMemberModePrefix}
          Press 1-9 or Esc to cancel
        {:else}
          Press 1-9, a-z, or Esc to cancel
        {/if}
      </span>
    </div>
    <div class="p-3 font-body text-sm text-gray-600">
      {#if $openMemberModePrefix}
        Press the number to complete: {$openMemberModePrefix}1, {$openMemberModePrefix}2, ...
      {:else}
        Press the key shown on a member to open their profile
      {/if}
    </div>
  </div>
{:else if pendingKey === 'o' && $page.url.pathname === '/collectives'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">
        Open collective{$openCollectiveModePrefix ? ` (${$openCollectiveModePrefix}...)` : '...'}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {#if $openCollectiveModePrefix}
          Press 1-9 or Esc to cancel
        {:else}
          Press 1-9, a-z, or Esc to cancel
        {/if}
      </span>
    </div>
    <div class="p-3 font-body text-sm text-gray-600">
      {#if $openCollectiveModePrefix}
        Press the number to complete: {$openCollectiveModePrefix}1, {$openCollectiveModePrefix}2, ...
      {:else}
        Press the key shown on a collective to open it
      {/if}
    </div>
  </div>
{:else if pendingKey === 'f'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-64">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">
        {#if $filterModeCategory}
          Filter: {FILTER_CATEGORY_LABELS[$filterModeCategory]?.label ?? $filterModeCategory}{$filterModePrefix ? ` (${$filterModePrefix}...)` : ''}
        {:else}
          Filter by...
        {/if}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {#if $filterModeCategory}
          {#if $filterModePrefix}
            Press 1-9 or Esc to cancel
          {:else}
            Press 1-9, a-z, or Esc to exit
          {/if}
        {:else}
          Press key or Esc to cancel
        {/if}
      </span>
    </div>
    {#if $filterModeCategory}
      <div class="p-3 font-body text-sm text-gray-600">
        {#if $filterModePrefix}
          Press the number to complete: {$filterModePrefix}1, {$filterModePrefix}2, ...
        {:else}
          Press key shown next to filter value (1-9 or a1, b2, ...)
        {/if}
      </div>
    {:else}
      <div class="p-2 space-y-1 font-body text-sm">
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">Country</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">c</kbd>
        </div>
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">City</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">i</kbd>
        </div>
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">Organization</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">o</kbd>
        </div>
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">Job Title</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">j</kbd>
        </div>
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">Department</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">d</kbd>
        </div>
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">Relationship</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">r</kbd>
        </div>
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">Circles</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">l</kbd>
        </div>
        <div class="border-t border-gray-200 mt-2 pt-2">
          <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-red-50">
            <span class="text-red-600">Clear all filters</span>
            <kbd class="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-600">x</kbd>
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else if pendingKey === 'e' && $page.url.pathname === '/circles'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">
        Edit circle{$editCircleModePrefix ? ` (${$editCircleModePrefix}...)` : '...'}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {#if $editCircleModePrefix}
          Press 1-9 or Esc to cancel
        {:else}
          Press 1-9, a-z, or Esc to cancel
        {/if}
      </span>
    </div>
    <div class="p-3 font-body text-sm text-gray-600">
      {#if $editCircleModePrefix}
        Press the number to complete: {$editCircleModePrefix}1, {$editCircleModePrefix}2, ...
      {:else}
        Press the key shown on a circle to edit it
      {/if}
    </div>
  </div>
{:else if pendingKey === 'd' && $page.url.pathname === '/circles'}
  <div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
    <div class="bg-red-50 px-3 py-2 border-b border-red-200">
      <span class="text-sm font-medium text-red-700">
        Delete circle{$deleteCircleModePrefix ? ` (${$deleteCircleModePrefix}...)` : '...'}
      </span>
      <span class="text-xs text-red-500 ml-2">
        {#if $deleteCircleModePrefix}
          Press 1-9 or Esc to cancel
        {:else}
          Press 1-9, a-z, or Esc to cancel
        {/if}
      </span>
    </div>
    <div class="p-3 font-body text-sm text-red-600">
      {#if $deleteCircleModePrefix}
        Press the number to complete: {$deleteCircleModePrefix}1, {$deleteCircleModePrefix}2, ...
      {:else}
        Press the key shown on a circle to delete it
      {/if}
    </div>
  </div>
{/if}
