<script lang="ts">
import { onMount } from 'svelte';
import { getAppContext } from '$lib/app-context.js';
import CitySelect from '$lib/components/friends/CitySelect.svelte';
import CountrySelect from '$lib/components/friends/CountrySelect.svelte';
import HouseNumberInput from '$lib/components/friends/HouseNumberInput.svelte';
import PostalCodeInput from '$lib/components/friends/PostalCodeInput.svelte';
import StreetInput from '$lib/components/friends/StreetInput.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import {
  type AddressType,
  type CityInfoResponse,
  type HouseNumberInfoResponse,
  isCountryCode,
  type PostalCodeInfoResponse,
  type StreetInfoResponse,
} from '$shared';

const { api, logger } = getAppContext();
const addressLookupApi = api.addressLookup;
const i18n = createI18n();

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
  /** ISO country code to preselect */
  initialCountryCode?: string;
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

// State for each step - initialize with functions to capture initial values
let selectedCountryCode = $state(
  (() => (isCountryCode(initialCountryCode) === true ? initialCountryCode : ''))(),
);
let postalCode = $state((() => initialPostalCode)());
let selectedCity = $state((() => initialCity)());
let selectedState = $state((() => initialState)());
let selectedStreet = $state((() => initialStreet)());
let houseNumber = $state((() => initialHouseNumber)());
let streetLine2 = $state((() => initialStreetLine2)());

// Data from APIs
let postalCodeSuggestions = $state<PostalCodeInfoResponse[]>([]);
let cities = $state<CityInfoResponse[]>([]);
let streets = $state<StreetInfoResponse[]>([]);
let houseNumbers = $state<HouseNumberInfoResponse[]>([]);

// Loading states
let isLoadingCities = $state(false);
let isLoadingStreets = $state(false);
let isLoadingHouseNumbers = $state(false);

// Free text fallback states
let streetFreeText = $state(false);
let houseNumberFreeText = $state(false);

// Debounce timers
let postalCodeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let postalSuggestDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let streetDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let houseNumberDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Abort controllers for canceling pending requests
let streetAbortController: AbortController | null = null;
let houseNumberAbortController: AbortController | null = null;

// Element references for focus management
let postalCodeInputRef: { focus: () => void } | undefined;

// When editing an existing address, preload cities/streets/house numbers in background
function preloadOnMount() {
  if (selectedCountryCode !== '' && postalCode !== '') {
    void preloadExistingAddress();
  }
}

onMount(preloadOnMount);

async function preloadExistingAddress() {
  await loadCities();
  if (selectedCity === '') {
    return;
  }
  scheduleStreetLoad();
  if (selectedStreet !== '') {
    scheduleHouseNumberLoad();
  }
}

async function loadCities() {
  if (selectedCountryCode === '' || postalCode.length < 3) {
    cities = [];
    return;
  }

  isLoadingCities = true;
  try {
    cities = await addressLookupApi.listCities(selectedCountryCode, postalCode);
    // Auto-select if only one result
    const onlyCity = cities.length === 1 ? cities[0] : undefined;
    if (onlyCity !== undefined) {
      selectedCity = onlyCity.city;
      selectedState = onlyCity.state ?? '';
      // Load streets for the auto-selected city
      scheduleStreetLoad();
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to load cities');
    cities = [];
  } finally {
    isLoadingCities = false;
  }
}

function cancelStreetLoad() {
  if (streetDebounceTimer !== null) {
    clearTimeout(streetDebounceTimer);
    streetDebounceTimer = null;
  }
  if (streetAbortController !== null) {
    streetAbortController.abort();
    streetAbortController = null;
  }
}

function scheduleStreetLoad() {
  cancelStreetLoad();

  if (selectedCountryCode === '' || postalCode === '' || selectedCity === '') {
    streets = [];
    isLoadingStreets = false;
    return;
  }

  isLoadingStreets = true;
  streetDebounceTimer = setTimeout(loadStreets, 300);
}

async function loadStreets() {
  streetAbortController = new AbortController();
  streetFreeText = false;
  try {
    streets = await addressLookupApi.listStreets({
      countryCode: selectedCountryCode,
      city: selectedCity,
      postalCode,
    });
    if (streets.length === 0) {
      streetFreeText = true;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return; // Request was cancelled, ignore
    }
    logger.error({ err: error }, 'Failed to load streets');
    streets = [];
    streetFreeText = true;
  } finally {
    isLoadingStreets = false;
  }
}

function cancelHouseNumberLoad() {
  if (houseNumberDebounceTimer !== null) {
    clearTimeout(houseNumberDebounceTimer);
    houseNumberDebounceTimer = null;
  }
  if (houseNumberAbortController !== null) {
    houseNumberAbortController.abort();
    houseNumberAbortController = null;
  }
}

function scheduleHouseNumberLoad() {
  cancelHouseNumberLoad();

  if (
    selectedCountryCode === '' ||
    postalCode === '' ||
    selectedCity === '' ||
    selectedStreet === '' ||
    streetFreeText === true
  ) {
    houseNumbers = [];
    isLoadingHouseNumbers = false;
    if (streetFreeText === true) {
      houseNumberFreeText = true;
    }
    return;
  }

  isLoadingHouseNumbers = true;
  houseNumberDebounceTimer = setTimeout(loadHouseNumbers, 300);
}

async function loadHouseNumbers() {
  houseNumberAbortController = new AbortController();
  houseNumberFreeText = false;
  try {
    houseNumbers = await addressLookupApi.listHouseNumbers({
      countryCode: selectedCountryCode,
      city: selectedCity,
      postalCode,
      street: selectedStreet,
    });
    if (houseNumbers.length === 0) {
      houseNumberFreeText = true;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return; // Request was cancelled, ignore
    }
    logger.error({ err: error }, 'Failed to load house numbers');
    houseNumbers = [];
    houseNumberFreeText = true;
  } finally {
    isLoadingHouseNumbers = false;
  }
}

function focusPostalCode() {
  postalCodeInputRef?.focus();
}

function triggerCityLoad() {
  void loadCities();
}

function triggerPostalCodeSuggestions() {
  void loadPostalCodeSuggestions();
}

function handleCountryChange(code: string, viaKeyboard: boolean = false) {
  selectedCountryCode = code;
  // Cancel any pending street/house number loads
  cancelStreetLoad();
  cancelHouseNumberLoad();
  // Reset downstream
  postalCode = '';
  selectedCity = '';
  selectedState = '';
  selectedStreet = '';
  houseNumber = '';
  postalCodeSuggestions = [];
  cities = [];
  streets = [];
  houseNumbers = [];
  streetFreeText = false;
  houseNumberFreeText = false;
  emitChange();

  // Focus postal code if selected via keyboard
  if (viaKeyboard === true) {
    requestAnimationFrame(focusPostalCode);
  }
}

async function loadPostalCodeSuggestions() {
  if (selectedCountryCode === '' || postalCode.length < 2) {
    postalCodeSuggestions = [];
    return;
  }

  try {
    postalCodeSuggestions = await addressLookupApi.listPostalCodes(selectedCountryCode, postalCode);
  } catch (error) {
    logger.error({ err: error }, 'Failed to load postal code suggestions');
    postalCodeSuggestions = [];
  }
}

function handlePostalCodeChange(value: string) {
  postalCode = value;
  // Cancel pending street/house number loads when postal code changes
  cancelStreetLoad();
  cancelHouseNumberLoad();

  // Debounce the city lookup
  if (postalCodeDebounceTimer !== null) {
    clearTimeout(postalCodeDebounceTimer);
  }

  if (value.length >= 3 && selectedCountryCode !== '') {
    postalCodeDebounceTimer = setTimeout(triggerCityLoad, 300);
  }

  // Debounce the postal-code prefix suggestions (separate, shorter trigger)
  if (postalSuggestDebounceTimer !== null) {
    clearTimeout(postalSuggestDebounceTimer);
  }
  if (value.length >= 2 && selectedCountryCode !== '') {
    postalSuggestDebounceTimer = setTimeout(triggerPostalCodeSuggestions, 300);
  } else {
    postalCodeSuggestions = [];
  }

  emitChange();
}

function handlePostalCodeSuggestionSelect(code: string, city: string) {
  postalCode = code;
  postalCodeSuggestions = [];
  selectedCity = city;
  selectedState = '';
  // Populate the city list for this postal code and load downstream data
  void loadCities();
  scheduleStreetLoad();
  emitChange();
}

function handleCitySelect(city: CityInfoResponse) {
  selectedCity = city.city;
  selectedState = city.state ?? '';
  // Cancel pending street/house number loads when city changes
  cancelStreetLoad();
  cancelHouseNumberLoad();

  // Schedule street load if we have enough data
  if (selectedCountryCode !== '' && postalCode !== '') {
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
  if (
    isFreeText === false &&
    selectedCountryCode !== '' &&
    postalCode !== '' &&
    selectedCity !== ''
  ) {
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
  const streetLine1 = `${selectedStreet} ${houseNumber}`.trim();

  onChange?.({
    country: selectedCountryCode,
    postal_code: postalCode,
    city: selectedCity,
    state_province: selectedState === '' ? undefined : selectedState,
    street_line1: streetLine1,
    street_line2: streetLine2 === '' ? undefined : streetLine2,
    address_type: addressType,
  });
}
</script>

<div class="space-y-3">
  <!-- Country -->
  <CountrySelect value={selectedCountryCode} {disabled} onSelect={handleCountryChange} />

  <!-- Postal Code -->
  <PostalCodeInput
    bind:this={postalCodeInputRef}
    bind:value={postalCode}
    isLoading={isLoadingCities}
    suggestions={postalCodeSuggestions}
    {disabled}
    onChange={handlePostalCodeChange}
    onSuggestionSelect={handlePostalCodeSuggestionSelect}
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
    <label for="street-line-2-input" class={FORM_CLASSES.label}>
      {$i18n.t('address.streetLine2')}
      <span class="text-gray-400">({$i18n.t('common.optional')})</span>
    </label>
    <input
      id="street-line-2-input"
      type="text"
      value={streetLine2}
      oninput={handleStreetLine2Change}
      placeholder={$i18n.t('address.streetLine2Placeholder')}
      {disabled}
      class={FORM_CLASSES.inputSm}
    />
  </div>
</div>
