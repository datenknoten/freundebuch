<script lang="ts">
import type { UrlData } from '$lib/api/url-data.js';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormInput from '$lib/components/ui/FormInput.svelte';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { UrlResponse, UrlType } from '$shared';

const i18n = createI18n();

interface Props {
  initialData?: UrlResponse;
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, disabled = false, onchange }: Props = $props();

// Form state - initialize with functions to capture initial values
let url = $state((() => initialData?.url ?? '')());
let urlType = $state<UrlType>((() => initialData?.urlType ?? 'personal')());
let label = $state((() => initialData?.label ?? '')());

function trackDirtyFields() {
  url;
  urlType;
  label;
}

createDirtyTracker(trackDirtyFields, () => onchange);

const urlTypeOptions = $derived([
  { value: 'personal' as const, label: $i18n.t('subresources.url.types.personal') },
  { value: 'work' as const, label: $i18n.t('subresources.url.types.work') },
  { value: 'blog' as const, label: $i18n.t('subresources.url.types.blog') },
  { value: 'other' as const, label: $i18n.t('subresources.url.types.other') },
]);

export function getData() {
  const trimmedLabel = label.trim();
  return {
    url: url.trim(),
    urlType,
    label: trimmedLabel === '' ? undefined : trimmedLabel,
  } satisfies UrlData;
}

export function isValid() {
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
  <FormInput
    id="url-value"
    label={$i18n.t('subresources.url.url')}
    bind:value={url}
    type="url"
    {disabled}
    placeholder={$i18n.t('subresources.url.placeholder.url')}
    required
    autofocus
  />

  <FormSelect
    id="url-type"
    label={$i18n.t('subresources.common.type')}
    bind:value={urlType}
    options={urlTypeOptions}
    {disabled}
  />

  <FormInput
    id="url-label"
    label={$i18n.t('subresources.common.label')}
    bind:value={label}
    {disabled}
    placeholder={$i18n.t('subresources.url.placeholder.label')}
    optional
    optionalText={$i18n.t('common.optional')}
  />
</div>
