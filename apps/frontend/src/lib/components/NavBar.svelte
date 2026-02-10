<script lang="ts">
import { fade } from 'svelte/transition';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { createI18n } from '$lib/i18n/index.js';
import { auth, currentUser, isAuthenticated } from '$lib/stores/auth';
import { search } from '$lib/stores/search';
import UserMenu from './UserMenu.svelte';

const i18n = createI18n();

// Detect platform for keyboard shortcut hint
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

let mobileMenuOpen = $state(false);

const version = __APP_VERSION__;

// Derive page title from current route
const pageTitle = $derived.by(() => {
  const pathname = $page.url.pathname;
  const t = $i18n.t;
  if (pathname === '/' || pathname === '/friends') return t('nav.friends');
  if (pathname === '/friends/new') return t('friends.addNew');
  if (pathname.startsWith('/friends/') && pathname.endsWith('/edit')) return t('common.edit');
  if (pathname.startsWith('/friends/')) return t('nav.friends');
  if (pathname === '/circles') return t('nav.circles');
  if (pathname === '/encounters') return t('nav.encounters');
  if (pathname === '/encounters/new') return t('encounters.logNew');
  if (pathname.startsWith('/encounters/')) return t('nav.encounters');
  if (pathname === '/collectives') return t('nav.collectives');
  if (pathname === '/collectives/new') return t('collectives.createNew');
  if (pathname.startsWith('/collectives/')) return t('nav.collectives');
  if (pathname === '/profile') return t('nav.profile');
  if (pathname.startsWith('/auth/')) return 'Freundebuch';
  return 'Freundebuch';
});

async function handleLogout() {
  mobileMenuOpen = false;
  try {
    await auth.logout();
    goto('/auth/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

function closeMobileMenu() {
  mobileMenuOpen = false;
}

let menuElement: HTMLDivElement;

// Prevent body scroll when mobile menu is open
$effect(() => {
  if (mobileMenuOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  return () => {
    document.body.style.overflow = '';
  };
});

// Focus trap for mobile menu
$effect(() => {
  if (mobileMenuOpen && menuElement) {
    const focusableElements = menuElement.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    }

    menuElement.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscape);
    firstFocusable?.focus();

    return () => {
      menuElement.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscape);
    };
  }
});
</script>

<!-- Mobile menu overlay -->
{#if mobileMenuOpen}
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 bg-gray-900/50 z-40 sm:hidden"
    onclick={closeMobileMenu}
    onkeydown={(e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closeMobileMenu();
      }
    }}
    role="button"
    tabindex="0"
    aria-label="Close menu"
  ></div>
{/if}

<!-- Mobile slide-out menu -->
<div
  bind:this={menuElement}
  class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-200 ease-in-out sm:hidden {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="p-4 border-b border-gray-200">
    <a href="/" onclick={closeMobileMenu}>
      <img src="/logo-navbar.png" alt="Freundebuch" class="h-8" />
    </a>
  </div>

  <nav class="p-4" aria-label="Mobile navigation menu">
    {#if $isAuthenticated && $currentUser}
      <div class="space-y-2">
        <a
          href="/friends/new"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('friends.addNew')}
        </a>
        <a
          href="/friends"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {$i18n.t('nav.friends')}
        </a>
        <a
          href="/circles"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          {$i18n.t('nav.circles')}
        </a>
        <a
          href="/encounters"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {$i18n.t('nav.encounters')}
        </a>
        <a
          href="/collectives"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {$i18n.t('nav.collectives')}
        </a>
        <a
          href="/profile"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {$i18n.t('nav.profile')}
        </a>
      </div>

      <div class="mt-6 pt-6 border-t border-gray-200">
        <div class="px-3 py-2 text-gray-500 font-body text-sm truncate">
          {$currentUser.email}
        </div>
        <button
          onclick={handleLogout}
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {$i18n.t('nav.logout')}
        </button>
      </div>
    {:else}
      <div class="space-y-2">
        <a
          href="/auth/login"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          {$i18n.t('nav.login')}
        </a>
        <a
          href="/auth/register"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md bg-forest text-white hover:bg-forest-light font-body font-medium transition-colors duration-200"
        >
          {$i18n.t('nav.register')}
        </a>
      </div>
    {/if}
  </nav>

  <div class="absolute bottom-4 left-0 right-0 px-4">
    <div class="flex justify-center gap-3 mb-2">
      <a
        href="/privacy"
        onclick={closeMobileMenu}
        class="text-gray-400 hover:text-forest text-xs font-body transition-colors duration-200"
      >
        {$i18n.t('footer.privacy')}
      </a>
      <span class="text-gray-300">|</span>
      <a
        href="/terms"
        onclick={closeMobileMenu}
        class="text-gray-400 hover:text-forest text-xs font-body transition-colors duration-200"
      >
        {$i18n.t('footer.terms')}
      </a>
    </div>
    <p class="text-center text-gray-400 text-xs font-body">v{version}</p>
  </div>
</div>

<nav class="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center h-16 gap-4">
      <!-- Mobile: Hamburger menu button -->
      <button
        class="sm:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200"
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if mobileMenuOpen}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          {/if}
        </svg>
      </button>

      <!-- Desktop: Logo -->
      <div class="hidden sm:flex items-center shrink-0">
        <a href="/">
          <img src="/logo-navbar.png" alt="Freundebuch" class="h-9" />
        </a>
      </div>

      <!-- Mobile: Page title (centered) -->
      <div class="sm:hidden flex-1 text-center">
        <span class="text-lg font-heading text-forest">{pageTitle}</span>
      </div>

      <!-- Mobile: Search button (authenticated) or spacer -->
      {#if $isAuthenticated && $currentUser}
        <button
          class="sm:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200"
          onclick={() => search.open()}
          aria-label="Search"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      {:else}
        <div class="sm:hidden w-10"></div>
      {/if}

      <!-- Desktop: Centered search bar (authenticated only) -->
      {#if $isAuthenticated && $currentUser}
        <div class="hidden sm:flex flex-1 justify-center px-4">
          <button
            onclick={() => search.open()}
            class="w-full max-w-md flex items-center gap-3 px-4 py-2 text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors duration-200 cursor-text"
            title="{$i18n.t('common.search')} ({isMac ? 'Cmd' : 'Ctrl'}+K)"
          >
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="flex-1 text-left font-body text-sm">{$i18n.t('friends.search')}</span>
            <kbd class="hidden md:inline-block px-2 py-1 text-xs bg-white border border-gray-200 rounded font-mono text-gray-400">
              {isMac ? '⌘' : 'Ctrl'}K
            </kbd>
          </button>
        </div>
      {/if}

      <!-- Desktop: Right side actions -->
      <div class="hidden sm:flex items-center gap-3 shrink-0">
        {#if $isAuthenticated && $currentUser}
          <a
            href="/friends/new"
            data-sveltekit-preload-data="tap"
            class="inline-flex items-center gap-1.5 bg-forest text-white px-3 py-1.5 rounded-md font-body font-medium hover:bg-forest-light transition-colors duration-200 text-sm"
            title="{$i18n.t('friends.addNew')} (n)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="hidden md:inline">{$i18n.t('common.new')}</span>
          </a>
          <UserMenu />
        {:else}
          <a
            href="/auth/login"
            class="text-gray-700 hover:text-forest font-body font-medium transition-colors duration-200"
          >
            {$i18n.t('nav.login')}
          </a>
          <a
            href="/auth/register"
            class="bg-forest text-white px-4 py-2 rounded-md font-body font-medium hover:bg-forest-light transition-colors duration-200"
          >
            {$i18n.t('nav.register')}
          </a>
        {/if}
      </div>
    </div>
  </div>
</nav>

<!-- Spacer to prevent content from being hidden behind fixed navbar -->
<div class="h-16"></div>
