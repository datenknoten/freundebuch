<script lang="ts">
import { createDirtyTracker, FormInput, FormSelect } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { Url, UrlInput, UrlType } from '$shared';

const i18n = createI18n();

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

createDirtyTracker(
  () => {
    url;
    urlType;
    label;
  },
  () => onchange,
);

const urlTypeOptions = $derived([
  { value: 'personal' as const, label: $i18n.t('subresources.url.types.personal') },
  { value: 'work' as const, label: $i18n.t('subresources.url.types.work') },
  { value: 'blog' as const, label: $i18n.t('subresources.url.types.blog') },
  { value: 'other' as const, label: $i18n.t('subresources.url.types.other') },
]);

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
  <FormInput
    id="url-value"
    label={$i18n.t('subresources.url.url')}
    bind:value={url}
    type="url"
    {disabled}
    placeholder="https://example.com"
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
    placeholder="e.g., Portfolio, LinkedIn"
    optional
    optionalText={$i18n.t('common.optional')}
  />
</div>
