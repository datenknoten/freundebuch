<script lang="ts">
import { fade } from 'svelte/transition';
import ArrowRightOnRectangle from 'svelte-heros-v2/ArrowRightOnRectangle.svelte';
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Swatch from 'svelte-heros-v2/Swatch.svelte';
import User from 'svelte-heros-v2/User.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
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
          <Plus class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('friends.addNew')}
        </a>
        <a
          href="/friends"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <Users class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.friends')}
        </a>
        <a
          href="/circles"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <Swatch class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.circles')}
        </a>
        <a
          href="/encounters"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <Calendar class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.encounters')}
        </a>
        <a
          href="/collectives"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <BuildingOffice class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.collectives')}
        </a>
        <a
          href="/profile"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <User class="w-5 h-5" strokeWidth="2" />
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
          <ArrowRightOnRectangle class="w-5 h-5" strokeWidth="2" />
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
    <p class="text-center text-gray-400 text-xs font-body"><a href="https://github.com/datenknoten/freundebuch" class="hover:text-forest transition-colors duration-200" target="_blank" rel="noopener noreferrer">v{version}</a></p>
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
        <XMark class="w-6 h-6" strokeWidth="2" />
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
          <MagnifyingGlass class="w-6 h-6" strokeWidth="2" />
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
            <MagnifyingGlass class="w-5 h-5 shrink-0" strokeWidth="2" />
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
            <Plus class="w-4 h-4" strokeWidth="2" />
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
