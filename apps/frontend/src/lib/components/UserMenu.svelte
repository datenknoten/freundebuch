<script lang="ts">
import ArrowRightOnRectangle from 'svelte-heros-v2/ArrowRightOnRectangle.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import Swatch from 'svelte-heros-v2/Swatch.svelte';
import User from 'svelte-heros-v2/User.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import { getAppContext } from '$lib/app-context.js';
import UserAvatar from '$lib/components/UserAvatar.svelte';
import { FOCUS_RING } from '$lib/components/ui/focus-ring.js';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';

const logger = getAppContext().logger;
const auth = getAppContext().stores.auth;
const currentUser = auth.currentUser;

const i18n = createI18n();

let isOpen = $state(false);
let buttonRef = $state<HTMLButtonElement | null>(null);
let menuRef = $state<HTMLDivElement | null>(null);

function toggle() {
  isOpen = isOpen === false;
}

function close() {
  isOpen = false;
}

async function handleLogout() {
  close();
  try {
    await auth.logout();
    await goto('/auth/login');
  } catch (err) {
    logger.error({ err }, 'Logout failed');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen === true) {
    e.preventDefault();
    close();
    buttonRef?.focus();
  }
}

function handleClickOutside(e: MouseEvent) {
  if (
    isOpen === true &&
    menuRef !== null &&
    menuRef.contains(e.target as Node) === false &&
    buttonRef?.contains(e.target as Node) !== true
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
    class="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 transition-colors {FOCUS_RING}"
    aria-expanded={isOpen}
    aria-haspopup="menu"
    aria-label={$i18n.t('aria.userMenu')}
  >
    {#if $currentUser}
      <UserAvatar email={$currentUser.email} size="sm" />
    {/if}
    <ChevronDown class="w-4 h-4 text-gray-500 transition-transform duration-150 {isOpen ? 'rotate-180' : ''}" strokeWidth="2" />
  </button>

  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute right-0 mt-2 w-56 {SURFACE_CLASSES.popover} z-(--z-popover)"
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
          <Users class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t('userMenu.friends')}
        </a>
        <a
          href="/circles"
          onclick={close}
          class="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-gray-700 hover:bg-gray-50 transition-colors"
          role="menuitem"
          data-sveltekit-preload-data="tap"
        >
          <Swatch class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t('userMenu.circles')}
        </a>
        <a
          href="/encounters"
          onclick={close}
          class="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-gray-700 hover:bg-gray-50 transition-colors"
          role="menuitem"
          data-sveltekit-preload-data="tap"
        >
          <Calendar class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t('userMenu.encounters')}
        </a>
        <a
          href="/profile"
          onclick={close}
          class="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-gray-700 hover:bg-gray-50 transition-colors"
          role="menuitem"
          data-sveltekit-preload-data="tap"
        >
          <User class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t('userMenu.profile')}
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
          <ArrowRightOnRectangle class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t('userMenu.logout')}
        </button>
      </div>
    </div>
  {/if}
</div>
