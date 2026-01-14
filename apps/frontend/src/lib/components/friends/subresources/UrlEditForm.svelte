<script lang="ts">
import type { Url, UrlInput, UrlType } from '$shared';

interface Props {
  initialData?: Url;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let url = $state((() => initialData?.url ?? '')());
let urlType = $state<UrlType>((() => initialData?.urlType ?? 'personal')());
let label = $state((() => initialData?.label ?? '')());

// Auto-focus action - runs only once on mount
function autoFocus(node: HTMLElement) {
  node.focus();
}

// Skip initial effect run
let initialized = false;

// Call onchange when any field changes
$effect(() => {
  url;
  urlType;
  label;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

export function getData(): UrlInput {
  return {
    url: url.trim(),
    url_type: urlType,
    label: label.trim() || undefined,
  };
}

export function isValid(): boolean {
  const trimmed = url.trim();
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}
</script>

<div class="space-y-4">
  <!-- URL -->
  <div>
    <label for="url-value" class="block text-sm font-body font-medium text-gray-700 mb-1">
      URL <span class="text-red-500">*</span>
    </label>
    <input
      use:autoFocus
      id="url-value"
      type="url"
      bind:value={url}
      {disabled}
      placeholder="https://example.com"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
      required
    />
  </div>

  <!-- URL Type -->
  <div>
    <label for="url-type" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Type
    </label>
    <select
      id="url-type"
      bind:value={urlType}
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="personal">Personal</option>
      <option value="work">Work</option>
      <option value="blog">Blog</option>
      <option value="other">Other</option>
    </select>
  </div>

  <!-- Label (optional) -->
  <div>
    <label for="url-label" class="block text-sm font-body font-medium text-gray-700 mb-1">
      Label <span class="text-gray-400">(optional)</span>
    </label>
    <input
      id="url-label"
      type="text"
      bind:value={label}
      {disabled}
      placeholder="e.g., Portfolio, LinkedIn"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
             font-body disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
</div>
