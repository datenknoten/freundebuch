<script lang="ts">
import { onMount } from 'svelte';
import * as addressApi from '$lib/api/address-lookup';
import type { AddressType, CityInfo, CountryInfo, HouseNumberInfo, StreetInfo } from '$shared';
import CitySelect from './CitySelect.svelte';
import CountrySelect from './CountrySelect.svelte';
import HouseNumberInput from './HouseNumberInput.svelte';
import PostalCodeInput from './PostalCodeInput.svelte';
import StreetInput from './StreetInput.svelte';

interface AddressOutput {
  country: string;
  postal_code: string;
  city: string;
  state_province?: string;
  street_line1: string;
  street_line2?: string;
  address_type: AddressType;
}

interface Props {
  /** Initial country code for editing */
  initialCountryCode?: string;
  /** Initial country name for editing */
  initialCountryName?: string;
  /** Initial postal code for editing */
  initialPostalCode?: string;
  /** Initial city for editing */
  initialCity?: string;
  /** Initial state/province for editing */
  initialState?: string;
  /** Initial street for editing */
  initialStreet?: string;
  /** Initial house number for editing */
  initialHouseNumber?: string;
  /** Initial street line 2 for editing */
  initialStreetLine2?: string;
  /** Address type (home, work, other) */
  addressType: AddressType;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when address changes */
  onChange?: (address: AddressOutput) => void;
}

let {
  initialCountryCode = '',
  initialCountryName = '',
  initialPostalCode = '',
  initialCity = '',
  initialState = '',
  initialStreet = '',
  initialHouseNumber = '',
  initialStreetLine2 = '',
  addressType,
  disabled = false,
  onChange,
}: Props = $props();

// State for each step
let selectedCountryCode = $state(initialCountryCode);
let selectedCountryName = $state(initialCountryName);
let postalCode = $state(initialPostalCode);
let selectedCity = $state(initialCity);
let selectedState = $state(initialState);
let selectedStreet = $state(initialStreet);
let houseNumber = $state(initialHouseNumber);
let streetLine2 = $state(initialStreetLine2);

// Data from APIs
let countries = $state<CountryInfo[]>([]);
let cities = $state<CityInfo[]>([]);
let streets = $state<StreetInfo[]>([]);
let houseNumbers = $state<HouseNumberInfo[]>([]);

// Loading states
let isLoadingCountries = $state(false);
let isLoadingCities = $state(false);
let isLoadingStreets = $state(false);
let isLoadingHouseNumbers = $state(false);

// Free text fallback states
let streetFreeText = $state(false);
let houseNumberFreeText = $state(false);

// Debounce timers
let postalCodeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let streetDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let houseNumberDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Abort controllers for canceling pending requests
let streetAbortController: AbortController | null = null;
let houseNumberAbortController: AbortController | null = null;

// Element references for focus management
let postalCodeInputRef: { focus: () => void } | undefined;

// Load countries on mount, and preload other data if editing existing address
onMount(async () => {
  await loadCountries();

  // If editing an existing address, preload cities/streets/house numbers in background
  if (selectedCountryCode && postalCode) {
    loadCities().then(() => {
      if (selectedCity) {
        scheduleStreetLoad();
        // Also schedule house numbers if we have a street
        if (selectedStreet) {
          scheduleHouseNumberLoad();
        }
      }
    });
  }
});

async function loadCountries() {
  isLoadingCountries = true;
  try {
    countries = await addressApi.getCountries();

    // If we have a country name but no code (editing existing address), look up the code
    if (!selectedCountryCode && selectedCountryName) {
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === selectedCountryName.toLowerCase(),
      );
      if (matchedCountry) {
        selectedCountryCode = matchedCountry.code;
      }
    }
  } catch (error) {
    console.error('Failed to load countries:', error);
    countries = [];
  } finally {
    isLoadingCountries = false;
  }
}

async function loadCities() {
  if (!selectedCountryCode || postalCode.length < 3) {
    cities = [];
    return;
  }

  isLoadingCities = true;
  try {
    cities = await addressApi.getCities(selectedCountryCode, postalCode);
    // Auto-select if only one result
    if (cities.length === 1) {
      selectedCity = cities[0].city;
      selectedState = cities[0].state || '';
      // Load streets for the auto-selected city
      scheduleStreetLoad();
    }
  } catch (error) {
    console.error('Failed to load cities:', error);
    cities = [];
  } finally {
    isLoadingCities = false;
  }
}

function cancelStreetLoad() {
  if (streetDebounceTimer) {
    clearTimeout(streetDebounceTimer);
    streetDebounceTimer = null;
  }
  if (streetAbortController) {
    streetAbortController.abort();
    streetAbortController = null;
  }
}

function scheduleStreetLoad() {
  cancelStreetLoad();

  if (!selectedCountryCode || !postalCode || !selectedCity) {
    streets = [];
    isLoadingStreets = false;
    return;
  }

  isLoadingStreets = true;
  streetDebounceTimer = setTimeout(async () => {
    streetAbortController = new AbortController();
    streetFreeText = false;
    try {
      streets = await addressApi.getStreets(selectedCountryCode, selectedCity, postalCode);
      if (streets.length === 0) {
        streetFreeText = true;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      console.error('Failed to load streets:', error);
      streets = [];
      streetFreeText = true;
    } finally {
      isLoadingStreets = false;
    }
  }, 300);
}

function cancelHouseNumberLoad() {
  if (houseNumberDebounceTimer) {
    clearTimeout(houseNumberDebounceTimer);
    houseNumberDebounceTimer = null;
  }
  if (houseNumberAbortController) {
    houseNumberAbortController.abort();
    houseNumberAbortController = null;
  }
}

function scheduleHouseNumberLoad() {
  cancelHouseNumberLoad();

  if (!selectedCountryCode || !postalCode || !selectedCity || !selectedStreet || streetFreeText) {
    houseNumbers = [];
    isLoadingHouseNumbers = false;
    if (streetFreeText) {
      houseNumberFreeText = true;
    }
    return;
  }

  isLoadingHouseNumbers = true;
  houseNumberDebounceTimer = setTimeout(async () => {
    houseNumberAbortController = new AbortController();
    houseNumberFreeText = false;
    try {
      houseNumbers = await addressApi.getHouseNumbers(
        selectedCountryCode,
        selectedCity,
        postalCode,
        selectedStreet,
      );
      if (houseNumbers.length === 0) {
        houseNumberFreeText = true;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      console.error('Failed to load house numbers:', error);
      houseNumbers = [];
      houseNumberFreeText = true;
    } finally {
      isLoadingHouseNumbers = false;
    }
  }, 300);
}

function handleCountryChange(code: string, name: string, viaKeyboard: boolean = false) {
  selectedCountryCode = code;
  selectedCountryName = name;
  // Cancel any pending street/house number loads
  cancelStreetLoad();
  cancelHouseNumberLoad();
  // Reset downstream
  postalCode = '';
  selectedCity = '';
  selectedState = '';
  selectedStreet = '';
  houseNumber = '';
  cities = [];
  streets = [];
  houseNumbers = [];
  streetFreeText = false;
  houseNumberFreeText = false;
  emitChange();

  // Focus postal code if selected via keyboard
  if (viaKeyboard) {
    requestAnimationFrame(() => {
      postalCodeInputRef?.focus();
    });
  }
}

function handlePostalCodeChange(value: string) {
  postalCode = value;
  // Cancel pending street/house number loads when postal code changes
  cancelStreetLoad();
  cancelHouseNumberLoad();

  // Debounce the city lookup
  if (postalCodeDebounceTimer) {
    clearTimeout(postalCodeDebounceTimer);
  }

  if (value.length >= 3 && selectedCountryCode) {
    postalCodeDebounceTimer = setTimeout(() => {
      loadCities();
    }, 300);
  }

  emitChange();
}

function handleCitySelect(city: CityInfo) {
  selectedCity = city.city;
  selectedState = city.state || '';
  // Cancel pending street/house number loads when city changes
  cancelStreetLoad();
  cancelHouseNumberLoad();

  // Schedule street load if we have enough data
  if (selectedCountryCode && postalCode) {
    scheduleStreetLoad();
  }

  emitChange();
}

function handleStreetSelect(street: string, isFreeText: boolean) {
  selectedStreet = street;
  streetFreeText = isFreeText;
  // Cancel pending house number loads when street changes
  cancelHouseNumberLoad();

  // Schedule house number load if we have enough data and not in free text mode
  if (!isFreeText && selectedCountryCode && postalCode && selectedCity) {
    scheduleHouseNumberLoad();
  } else {
    houseNumberFreeText = true;
  }

  emitChange();
}

function handleHouseNumberSelect(number: string) {
  houseNumber = number;
  emitChange();
}

function handleStreetLine2Change(e: Event) {
  streetLine2 = (e.target as HTMLInputElement).value;
  emitChange();
}

function emitChange() {
  // Emit whenever we have enough data to form a partial address
  // The parent component's validation will determine what's truly required
  const country = selectedCountryName || selectedCountryCode;
  const streetLine1 = `${selectedStreet} ${houseNumber}`.trim();

  onChange?.({
    country: country || '',
    postal_code: postalCode || '',
    city: selectedCity || '',
    state_province: selectedState || undefined,
    street_line1: streetLine1 || '',
    street_line2: streetLine2 || undefined,
    address_type: addressType,
  });
}
</script>

<div class="space-y-3">
  <!-- Country -->
  <CountrySelect
    {countries}
    value={selectedCountryCode}
    isLoading={isLoadingCountries}
    {disabled}
    onSelect={handleCountryChange}
  />

  <!-- Postal Code -->
  <PostalCodeInput
    bind:this={postalCodeInputRef}
    bind:value={postalCode}
    isLoading={isLoadingCities}
    {disabled}
    onChange={handlePostalCodeChange}
  />

  <!-- City -->
  <CitySelect
    {cities}
    value={selectedCity}
    {disabled}
    onSelect={handleCitySelect}
    freeTextMode={cities.length === 0}
  />

  <!-- Street -->
  <StreetInput
    {streets}
    value={selectedStreet}
    isLoading={isLoadingStreets}
    freeTextMode={streetFreeText || streets.length === 0}
    {disabled}
    onSelect={handleStreetSelect}
  />

  <!-- House Number -->
  <HouseNumberInput
    {houseNumbers}
    bind:value={houseNumber}
    isLoading={isLoadingHouseNumbers}
    freeTextMode={houseNumberFreeText || houseNumbers.length === 0}
    {disabled}
    onSelect={handleHouseNumberSelect}
  />

  <!-- Street Line 2 (always available) -->
  <div class="relative">
    <label class="block text-sm font-medium text-gray-700 font-body mb-1">
      Additional Address Info (optional)
    </label>
    <input
      type="text"
      value={streetLine2}
      oninput={handleStreetLine2Change}
      placeholder="Apartment, suite, floor, etc."
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
</div>
