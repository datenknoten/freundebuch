<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

export type SubresourceType =
  | 'phone'
  | 'email'
  | 'address'
  | 'url'
  | 'date'
  | 'social'
  | 'circle'
  | 'professional'
  | 'relationship';

interface Props {
  onAdd: (type: SubresourceType) => void;
}

let { onAdd }: Props = $props();
let isOpen = $state(false);
let buttonRef = $state<HTMLButtonElement | null>(null);
let menuRef = $state<HTMLDivElement | null>(null);

const optionConfig: { type: SubresourceType; labelKey: string; icon: string }[] = [
  { type: 'phone', labelKey: 'subresources.dropdown.phoneNumber', icon: 'phone' },
  { type: 'email', labelKey: 'subresources.dropdown.emailAddress', icon: 'mail' },
  { type: 'address', labelKey: 'subresources.dropdown.address', icon: 'map-pin' },
  { type: 'url', labelKey: 'subresources.dropdown.websiteUrl', icon: 'link' },
  { type: 'date', labelKey: 'subresources.dropdown.importantDate', icon: 'calendar' },
  { type: 'social', labelKey: 'subresources.dropdown.socialProfile', icon: 'share' },
  { type: 'circle', labelKey: 'subresources.dropdown.circle', icon: 'users' },
  { type: 'professional', labelKey: 'subresources.dropdown.employment', icon: 'briefcase' },
];

function handleSelect(type: SubresourceType) {
  onAdd(type);
  isOpen = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen = false;
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
    isOpen = false;
  }
}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative">
  <button
    bind:this={buttonRef}
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-body font-semibold
           hover:bg-gray-50 transition-colors flex items-center gap-2"
    aria-expanded={isOpen}
    aria-haspopup="menu"
  >
    <svg
      class="w-4 h-4 transition-transform duration-150"
      class:rotate-180={isOpen}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
    <span>{$i18n.t('subresources.common.add')}</span>
  </button>

  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg
             border border-gray-200 py-1 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      {#each optionConfig as option}
        <button
          type="button"
          onclick={() => handleSelect(option.type)}
          class="w-full px-4 py-2 text-left text-sm font-body text-gray-700
                 hover:bg-gray-50 flex items-center gap-3 transition-colors"
          role="menuitem"
        >
          {#if option.icon === 'phone'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          {:else if option.icon === 'mail'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          {:else if option.icon === 'map-pin'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          {:else if option.icon === 'link'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          {:else if option.icon === 'calendar'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          {:else if option.icon === 'share'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          {:else if option.icon === 'users'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          {:else if option.icon === 'briefcase'}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          {/if}
          {$i18n.t(option.labelKey)}
        </button>
      {/each}
    </div>
  {/if}
</div>
