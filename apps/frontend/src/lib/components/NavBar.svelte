<script lang="ts">
import { fade } from 'svelte/transition';
import ArrowRightOnRectangle from 'svelte-heros-v2/ArrowRightOnRectangle.svelte';
import Bars3 from 'svelte-heros-v2/Bars3.svelte';
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
import { focusTrap } from '$lib/actions/focus-trap';
import { getAppContext } from '$lib/app-context.js';
import Button from '$lib/components/ui/Button.svelte';
import { CODE_CLASSES } from '$lib/components/ui/code-classes.js';
import { FOCUS_RING } from '$lib/components/ui/focus-ring.js';
import { createI18n } from '$lib/i18n/i18n.js';
import { motionDuration } from '$lib/utils/motion';
import LegalLinks from './LegalLinks.svelte';
import UserMenu from './UserMenu.svelte';

const { logger, stores } = getAppContext();
const overlay = stores.overlay;
const search = stores.search;

const auth = getAppContext().stores.auth;
const currentUser = auth.currentUser;
const isAuthenticated = auth.isAuthenticated;
const signupEnabled = getAppContext().stores.instance.signupEnabled;

const i18n = createI18n();

// Detect platform for keyboard shortcut hint
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

let isMobileMenuOpen = $state(false);

const APP_NAME = 'Freundebuch';

/** The i18n key of the header title for a route; `undefined` shows the app name. */
function findTitleKey(pathname: string) {
  if (pathname === '/' || pathname === '/friends') {
    return 'nav.friends';
  }
  if (pathname === '/friends/new') {
    return 'friends.addNew';
  }
  if (pathname.startsWith('/friends/') === true) {
    return pathname.endsWith('/edit') === true ? 'common.edit' : 'nav.friends';
  }
  if (pathname === '/circles') {
    return 'nav.circles';
  }
  if (pathname === '/encounters/new') {
    return 'encounters.logNew';
  }
  if (pathname === '/encounters' || pathname.startsWith('/encounters/') === true) {
    return 'nav.encounters';
  }
  if (pathname === '/collectives/new') {
    return 'collectives.createNew';
  }
  if (pathname === '/collectives' || pathname.startsWith('/collectives/') === true) {
    return 'nav.collectives';
  }
  if (pathname === '/profile') {
    return 'nav.profile';
  }
  return undefined;
}

const pageTitleKey = $derived(findTitleKey($page.url.pathname));
const pageTitle = $derived(pageTitleKey === undefined ? APP_NAME : $i18n.t(pageTitleKey));

async function handleLogout() {
  isMobileMenuOpen = false;
  try {
    await auth.logout();
    await goto('/auth/login');
  } catch (err) {
    logger.error({ err }, 'Logout failed');
  }
}

// A drawer entry is current when the route matches it exactly, or sits
// underneath it ("/friends/123" marks "Friends"). "/" only ever matches itself.
function isActive(href: string) {
  const path = $page.url.pathname;
  if (href === '/') {
    return path === '/';
  }
  return path === href || path.startsWith(`${href}/`) === true;
}

const drawerLink =
  'flex items-center gap-2 px-3 py-2 rounded-md font-body font-medium transition-colors';

function drawerLinkClass(href: string) {
  return isActive(href) === true
    ? `${drawerLink} bg-forest/10 text-forest`
    : `${drawerLink} text-gray-700 hover:bg-gray-100 hover:text-forest`;
}

function closeMobileMenu() {
  isMobileMenuOpen = false;
}

let menuElement = $state<HTMLDivElement | undefined>(undefined);

// While the drawer covers the page it is an overlay like any modal: lock
// body scroll and suppress the global shortcuts behind it.
function lockPageBehindDrawer() {
  if (isMobileMenuOpen === false) {
    return undefined;
  }

  document.body.style.overflow = 'hidden';
  const release = overlay.register();

  return function unlockPage() {
    document.body.style.overflow = '';
    release();
  };
}

$effect(lockPageBehindDrawer);

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMobileMenu();
  }
}

// Escape closes the drawer, and the first entry takes focus when it opens.
// Tab containment is the shared `focusTrap` action on the drawer itself.
function focusOpenDrawer() {
  if (isMobileMenuOpen === false || menuElement === undefined) {
    return undefined;
  }

  document.addEventListener('keydown', handleEscape);
  menuElement.querySelector<HTMLElement>('a[href], button')?.focus();

  return function stopListening() {
    document.removeEventListener('keydown', handleEscape);
  };
}

$effect(focusOpenDrawer);
</script>

<!-- Mobile menu overlay -->
{#if isMobileMenuOpen}
  <div
    transition:fade={{ duration: motionDuration(200) }}
    class="fixed inset-0 bg-gray-900/50 z-(--z-overlay) sm:hidden"
    onclick={closeMobileMenu}
    role="presentation"
  ></div>
{/if}

<!-- Mobile slide-out menu -->
<div
  bind:this={menuElement}
  use:focusTrap={isMobileMenuOpen}
  inert={!isMobileMenuOpen}
  aria-hidden={!isMobileMenuOpen}
  class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-(--z-overlay) transform transition-transform ease-in-out sm:hidden {isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="p-4 border-b border-gray-200">
    <a href="/" onclick={closeMobileMenu}>
      <img src="/logo-navbar.png" alt="Freundebuch" class="h-8" />
    </a>
  </div>

  <nav class="p-4" aria-label={$i18n.t('aria.mobileNavigation')}>
    {#if $isAuthenticated && $currentUser}
      <div class="space-y-2">
        <a
          href="/friends/new"
          data-sveltekit-preload-data="tap"
          data-shortcut="n f"
          data-shortcut-label="shortcuts.newFriend"
          onclick={closeMobileMenu}
          class={drawerLinkClass('/friends/new')}
          aria-current={isActive('/friends/new') ? 'page' : undefined}
        >
          <Plus class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('friends.addNew')}
        </a>
        <a
          href="/friends"
          data-sveltekit-preload-data="tap"
          data-shortcut="g f"
          data-shortcut-label="shortcuts.goFriends"
          onclick={closeMobileMenu}
          class={drawerLinkClass('/friends')}
          aria-current={isActive('/friends') ? 'page' : undefined}
        >
          <Users class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.friends')}
        </a>
        <a
          href="/circles"
          data-sveltekit-preload-data="tap"
          data-shortcut="g c"
          data-shortcut-label="shortcuts.goCircles"
          onclick={closeMobileMenu}
          class={drawerLinkClass('/circles')}
          aria-current={isActive('/circles') ? 'page' : undefined}
        >
          <Swatch class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.circles')}
        </a>
        <a
          href="/encounters"
          data-sveltekit-preload-data="tap"
          data-shortcut="g e"
          data-shortcut-label="shortcuts.goEncounters"
          onclick={closeMobileMenu}
          class={drawerLinkClass('/encounters')}
          aria-current={isActive('/encounters') ? 'page' : undefined}
        >
          <Calendar class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.encounters')}
        </a>
        <a
          href="/collectives"
          data-sveltekit-preload-data="tap"
          data-shortcut="g o"
          data-shortcut-label="shortcuts.goCollectives"
          onclick={closeMobileMenu}
          class={drawerLinkClass('/collectives')}
          aria-current={isActive('/collectives') ? 'page' : undefined}
        >
          <BuildingOffice class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.collectives')}
        </a>
        <a
          href="/profile"
          data-sveltekit-preload-data="tap"
          data-shortcut="g p"
          data-shortcut-label="shortcuts.goProfile"
          onclick={closeMobileMenu}
          class={drawerLinkClass('/profile')}
          aria-current={isActive('/profile') ? 'page' : undefined}
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
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors"
        >
          <ArrowRightOnRectangle class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('nav.logout')}
        </button>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        <Button href="/auth/login" variant="secondary" block onclick={closeMobileMenu}>
          {$i18n.t('nav.login')}
        </Button>
        {#if $signupEnabled}
          <Button href="/auth/register" block onclick={closeMobileMenu}>
            {$i18n.t('nav.register')}
          </Button>
        {/if}
      </div>
    {/if}
  </nav>

  <div class="absolute bottom-4 left-0 right-0 px-4">
    <LegalLinks size="sm" onnavigate={closeMobileMenu} />
  </div>
</div>

<nav class="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-(--z-nav)">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center h-(--nav-h) gap-4">
      <!-- Mobile: Hamburger menu button -->
      <button
        class="sm:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors {FOCUS_RING}"
        onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
        aria-label={$i18n.t('aria.toggleMenu')}
        aria-expanded={isMobileMenuOpen}
      >
        {#if isMobileMenuOpen}
          <XMark class="w-6 h-6" strokeWidth="2" />
        {:else}
          <Bars3 class="w-6 h-6" strokeWidth="2" />
        {/if}
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
          class="sm:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors {FOCUS_RING}"
          onclick={() => search.open()}
          aria-label={$i18n.t('aria.search')}
          data-shortcut="/"
          data-shortcut-label="shortcuts.help.focusSearch"
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
            class="w-full max-w-md flex items-center gap-3 px-4 py-2 text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-text"
            title="{$i18n.t('common.search')} ({isMac ? 'Cmd' : 'Ctrl'}+K)"
            data-shortcut="/"
            data-shortcut-label="shortcuts.help.focusSearch"
          >
            <MagnifyingGlass class="w-5 h-5 shrink-0" strokeWidth="2" />
            <span class="flex-1 text-left font-body text-sm">{$i18n.t('friends.search')}</span>
            <kbd class="hidden md:inline-block {CODE_CLASSES.kbd}">
              {isMac ? '⌘' : 'Ctrl'}K
            </kbd>
          </button>
        </div>
      {/if}

      <!-- Desktop: Right side actions -->
      <div class="hidden sm:flex items-center gap-3 shrink-0">
        {#if $isAuthenticated && $currentUser}
          <Button
            href="/friends/new"
            size="sm"
            data-sveltekit-preload-data="tap"
            data-shortcut="n f"
            data-shortcut-label="shortcuts.newFriend"
            title="{$i18n.t('friends.addNew')} (n)"
          >
            <Plus class="w-4 h-4" strokeWidth="2" />
            <span class="hidden md:inline">{$i18n.t('common.new')}</span>
          </Button>
          <UserMenu />
        {:else}
          <Button href="/auth/login" variant="secondary">
            {$i18n.t('nav.login')}
          </Button>
          {#if $signupEnabled}
            <Button href="/auth/register">
              {$i18n.t('nav.register')}
            </Button>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</nav>

<!-- Spacer to prevent content from being hidden behind fixed navbar -->
<div class="h-(--nav-h)"></div>
