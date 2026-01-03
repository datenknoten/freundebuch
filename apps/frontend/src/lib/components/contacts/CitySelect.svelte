<script lang="ts">
import type { CityInfo } from '$shared';

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

let freeTextValue = $state(value);

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
  <label class="block text-sm font-medium text-gray-700 font-body mb-1">City</label>

  {#if freeTextMode || cities.length === 0}
    <!-- Free text input when no cities available -->
    <input
      type="text"
      value={freeTextValue}
      oninput={handleFreeTextInput}
      onblur={handleFreeTextBlur}
      onkeydown={handleFreeTextKeydown}
      placeholder="Enter city name"
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    />
  {:else if cities.length === 1}
    <!-- Auto-selected single city - show as read-only -->
    <div
      class="w-full px-3 py-2 border border-gray-300 rounded-lg font-body text-sm bg-gray-50 text-gray-700"
    >
      {formatCityDisplay(cities[0])}
    </div>
  {:else}
    <!-- Multiple cities - show dropdown -->
    <select
      {value}
      onchange={handleChange}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-white cursor-pointer"
    >
      <option value="" disabled>Select a city</option>
      {#each cities as city}
        <option value={city.city}>{formatCityDisplay(city)}</option>
      {/each}
    </select>
    <svg
      class="absolute right-3 top-[calc(50%+0.5rem)] -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  {/if}
</div>
