<script lang="ts">
interface Props {
  /** Current postal code value */
  value: string;
  /** Whether data is loading (city lookup in progress) */
  isLoading?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when the postal code changes */
  onChange?: (value: string) => void;
}

let { value = $bindable(), isLoading = false, disabled = false, onChange }: Props = $props();

let inputElement: HTMLInputElement;

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  value = target.value;
  onChange?.(target.value);
}

// Expose focus method for parent component
export function focus() {
  inputElement?.focus();
}
</script>

<div class="relative">
  <label for="postal-code-input" class="block text-sm font-medium text-gray-700 font-body mb-1">Postal Code</label>

  <div class="relative">
    <input
      id="postal-code-input"
      type="text"
      bind:this={inputElement}
      {value}
      oninput={handleInput}
      placeholder="Enter postal code"
      {disabled}
      class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      autocomplete="postal-code"
    />

    {#if isLoading}
      <div class="absolute right-3 top-1/2 -translate-y-1/2">
        <svg
          class="animate-spin h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    {/if}
  </div>

  {#if value && value.length < 3 && !disabled}
    <p class="mt-1 text-xs text-gray-500 font-body">Enter at least 3 characters</p>
  {/if}
</div>
