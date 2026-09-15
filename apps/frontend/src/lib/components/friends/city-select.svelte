<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import { formClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { CityInfo } from '$shared';

const i18n = createI18n();

interface Props {
  /** Available cities to select from */
  cities: CityInfo[];
  /** Currently selected city */
  value: string;
  /** Whether free text mode is enabled (no city data available) */
  freeTextMode?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when a city is selected */
  onSelect?: (city: CityInfo) => void;
}

let { cities, value, freeTextMode = false, disabled = false, onSelect }: Props = $props();

// Initialize with function to capture initial value
let freeTextValue = $state((() => value)());

function handleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const selectedCity = cities.find((c) => c.city === target.value);
  if (selectedCity) {
    onSelect?.(selectedCity);
  }
}

function handleFreeTextInput(e: Event) {
  const target = e.target as HTMLInputElement;
  freeTextValue = target.value;
}

function handleFreeTextBlur() {
  if (freeTextValue) {
    onSelect?.({ city: freeTextValue, state: undefined, stateCode: undefined });
  }
}

function handleFreeTextKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (freeTextValue) {
      onSelect?.({ city: freeTextValue, state: undefined, stateCode: undefined });
    }
  }
}

// Format city display with state if available
function formatCityDisplay(city: CityInfo): string {
  if (city.state) {
    return `${city.city}, ${city.state}`;
  }
  return city.city;
}
</script>

<div class="relative">
  <label for="city-input" class={formClasses.label}>{$i18n.t('citySelect.label')}</label>

  {#if freeTextMode || cities.length === 0}
    <!-- Free text input when no cities available -->
    <input
      id="city-input"
      type="text"
      value={freeTextValue}
      oninput={handleFreeTextInput}
      onblur={handleFreeTextBlur}
      onkeydown={handleFreeTextKeydown}
      placeholder={$i18n.t('citySelect.placeholder')}
      {disabled}
      class={formClasses.inputSm}
    />
  {:else if cities.length === 1}
    <!-- Auto-selected single city - show as read-only -->
    <div class="{formClasses.inputSm} bg-gray-50 text-gray-700">
      {formatCityDisplay(cities[0])}
    </div>
  {:else}
    <!-- Multiple cities - show dropdown -->
    <select
      id="city-input"
      {value}
      onchange={handleChange}
      {disabled}
      class="{formClasses.inputSm} appearance-none bg-white cursor-pointer"
    >
      <option value="" disabled>{$i18n.t('citySelect.selectCity')}</option>
      {#each cities as city}
        <option value={city.city}>{formatCityDisplay(city)}</option>
      {/each}
    </select>
    <ChevronDown class="absolute right-3 top-[calc(50%+0.5rem)] -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth="2" />
  {/if}
</div>
