<script lang="ts">
import { goto } from '$app/navigation';
import { auth, currentUser } from '$lib/stores/auth';
import UserAvatar from './UserAvatar.svelte';

let isOpen = $state(false);
let buttonRef = $state<HTMLButtonElement | null>(null);
let menuRef = $state<HTMLDivElement | null>(null);

function toggle() {
  isOpen = !isOpen;
}

function close() {
  isOpen = false;
}

async function handleLogout() {
  close();
  try {
    await auth.logout();
    goto('/auth/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    close();
    buttonRef?.focus();
  }
}

function handleClickOutside(e: MouseEvent) {
  if (
    isOpen &&
    menuRef &&
    !menuRef.contains(e.target as Node) &&
    !buttonRef?.contains(e.target as Node)
  ) {
    close();
  }
}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative">
  <button
    bind:this={buttonRef}
    type="button"
    onclick={toggle}
    class="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
    aria-expanded={isOpen}
    aria-haspopup="menu"
    aria-label="User menu"
  >
    {#if $currentUser}
      <UserAvatar email={$currentUser.email} size="sm" />
    {/if}
    <svg
      class="w-4 h-4 text-gray-500 transition-transform duration-150"
      class:rotate-180={isOpen}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      <!-- User email -->
      {#if $currentUser}
        <div class="px-4 py-2 border-b border-gray-100">
          <p class="text-sm font-body text-gray-500 truncate">{$currentUser.email}</p>
        </div>
      {/if}

      <!-- Navigation links -->
      <div class="py-1">
        <a
          href="/friends"
          onclick={close}
          class="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-gray-700 hover:bg-gray-50 transition-colors"
          role="menuitem"
          data-sveltekit-preload-data="tap"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Friends
        </a>
        <a
          href="/profile"
          onclick={close}
          class="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-gray-700 hover:bg-gray-50 transition-colors"
          role="menuitem"
          data-sveltekit-preload-data="tap"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </a>
      </div>

      <!-- Logout -->
      <div class="border-t border-gray-100 py-1">
        <button
          type="button"
          onclick={handleLogout}
          class="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-gray-700 hover:bg-gray-50 transition-colors"
          role="menuitem"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  {/if}
</div>
