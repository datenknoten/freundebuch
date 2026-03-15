<script lang="ts">
import Briefcase from 'svelte-heros-v2/Briefcase.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Phone from 'svelte-heros-v2/Phone.svelte';
import Share from 'svelte-heros-v2/Share.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
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
  { type: 'relationship', labelKey: 'relationshipSection.addRelationship', icon: 'heart' },
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
    <ChevronDown class="w-4 h-4 transition-transform duration-150 {isOpen ? 'rotate-180' : ''}" strokeWidth="2" />
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
            <Phone class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'mail'}
            <Envelope class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'map-pin'}
            <MapPin class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'link'}
            <Link class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'calendar'}
            <Calendar class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'share'}
            <Share class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'users'}
            <Users class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'briefcase'}
            <Briefcase class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {:else if option.icon === 'heart'}
            <Heart class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {/if}
          {$i18n.t(option.labelKey)}
        </button>
      {/each}
    </div>
  {/if}
</div>
