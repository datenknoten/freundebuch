<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { auth, currentUser, isAuthenticated } from '$lib/stores/auth';

let mobileMenuOpen = $state(false);

// Derive page title from current route
const pageTitle = $derived(() => {
  const pathname = $page.url.pathname;
  if (pathname === '/' || pathname === '/contacts') return 'Contacts';
  if (pathname === '/contacts/new') return 'New Contact';
  if (pathname.startsWith('/contacts/') && pathname.endsWith('/edit')) return 'Edit Contact';
  if (pathname.startsWith('/contacts/')) return 'Contact';
  if (pathname === '/profile') return 'Profile';
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
</script>

<!-- Mobile menu overlay -->
{#if mobileMenuOpen}
  <div
    class="fixed inset-0 bg-gray-900/50 z-40 sm:hidden"
    onclick={closeMobileMenu}
    onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
    role="button"
    tabindex="0"
    aria-label="Close menu"
  ></div>
{/if}

<!-- Mobile slide-out menu -->
<div
  class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-200 ease-in-out sm:hidden {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="p-4 border-b border-gray-200">
    <a href="/" class="text-2xl font-heading text-forest" onclick={closeMobileMenu}>
      Freundebuch
    </a>
  </div>

  <nav class="p-4">
    {#if $isAuthenticated && $currentUser}
      <div class="space-y-2">
        <a
          href="/contacts/new"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Contact
        </a>
        <a
          href="/contacts"
          data-sveltekit-preload-data="tap"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Contacts
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
          Profile
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
          Logout
        </button>
      </div>
    {:else}
      <div class="space-y-2">
        <a
          href="/auth/login"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-forest font-body font-medium transition-colors duration-200"
        >
          Sign in
        </a>
        <a
          href="/auth/register"
          onclick={closeMobileMenu}
          class="flex items-center gap-2 px-3 py-2 rounded-md bg-forest text-white hover:bg-forest-light font-body font-medium transition-colors duration-200"
        >
          Sign up
        </a>
      </div>
    {/if}
  </nav>
</div>

<nav class="bg-white border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Mobile: Hamburger menu button -->
      <button
        class="sm:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200"
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
        aria-label="Toggle menu"
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
      <div class="hidden sm:flex items-center">
        <a href="/" class="text-2xl font-heading text-forest">
          Freundebuch
        </a>
      </div>

      <!-- Mobile: Page title (centered) -->
      <div class="sm:hidden flex-1 text-center">
        <span class="text-lg font-heading text-forest">{pageTitle()}</span>
      </div>

      <!-- Mobile: Spacer for symmetry -->
      <div class="sm:hidden w-10"></div>

      <!-- Desktop: Navigation items -->
      <div class="hidden sm:flex items-center gap-4">
        {#if $isAuthenticated && $currentUser}
          <a
            href="/contacts/new"
            data-sveltekit-preload-data="tap"
            class="inline-flex items-center gap-1 bg-forest text-white px-3 py-1.5 rounded-md font-body font-medium hover:bg-forest-light transition-colors duration-200 text-sm"
            title="Add new contact (n)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New
          </a>
          <a
            href="/contacts"
            data-sveltekit-preload-data="tap"
            class="text-gray-700 hover:text-forest font-body font-medium transition-colors duration-200"
          >
            Contacts
          </a>
          <a
            href="/profile"
            data-sveltekit-preload-data="tap"
            class="text-gray-700 hover:text-forest font-body font-medium transition-colors duration-200"
          >
            Profile
          </a>
          <span class="text-gray-500 font-body text-sm">{$currentUser.email}</span>
          <button
            onclick={handleLogout}
            class="bg-forest text-white px-4 py-2 rounded-md font-body font-medium hover:bg-forest-light transition-colors duration-200"
          >
            Logout
          </button>
        {:else}
          <a
            href="/auth/login"
            class="text-gray-700 hover:text-forest font-body font-medium transition-colors duration-200"
          >
            Sign in
          </a>
          <a
            href="/auth/register"
            class="bg-forest text-white px-4 py-2 rounded-md font-body font-medium hover:bg-forest-light transition-colors duration-200"
          >
            Sign up
          </a>
        {/if}
      </div>
    </div>
  </div>
</nav>
