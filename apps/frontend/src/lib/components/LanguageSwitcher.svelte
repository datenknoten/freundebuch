<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import Language from 'svelte-heros-v2/Language.svelte';
import { languageNames } from '$lib/i18n/index.js';
import {
  currentLanguage,
  locale,
  type SupportedLanguage,
  supportedLanguages,
} from '$lib/stores/locale';

let isOpen = $state(false);
let buttonRef = $state<HTMLButtonElement | null>(null);
let menuRef = $state<HTMLDivElement | null>(null);

function toggleDropdown() {
  isOpen = !isOpen;
}

function selectLanguage(lang: SupportedLanguage) {
  locale.setLanguage(lang);
  isOpen = false;
}

function handleClickOutside(event: MouseEvent) {
  if (
    isOpen &&
    buttonRef &&
    menuRef &&
    !buttonRef.contains(event.target as Node) &&
    !menuRef.contains(event.target as Node)
  ) {
    isOpen = false;
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen = false;
    buttonRef?.focus();
  }
}

$effect(() => {
  if (typeof document === 'undefined') return;

  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  };
});
</script>

<div class="relative">
  <button
    bind:this={buttonRef}
    onclick={toggleDropdown}
    class="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-forest rounded-md hover:bg-gray-100 transition-colors duration-200"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-label="Select language"
  >
    <Language class="w-4 h-4" strokeWidth="2" />
    <span class="uppercase font-medium">{$currentLanguage}</span>
    <ChevronDown class="w-3 h-3" strokeWidth="2" />
  </button>

  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute right-0 mt-1 py-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50"
      role="listbox"
      aria-label="Available languages"
    >
      {#each supportedLanguages as lang}
        <button
          onclick={() => selectLanguage(lang)}
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors duration-200 {$currentLanguage === lang ? 'text-forest font-medium bg-gray-50' : 'text-gray-700'}"
          role="option"
          aria-selected={$currentLanguage === lang}
        >
          {languageNames[lang]}
        </button>
      {/each}
    </div>
  {/if}
</div>
