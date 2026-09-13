<script lang="ts">
import MarkdownEditor from './markdown-editor.svelte';

interface Props {
  /** Raw markdown — two-way bound. */
  value?: string;
  /** Visible field label; also labels the editor via aria-labelledby. */
  label: string;
  /** Muted suffix after the label, e.g. the localized "(optional)". */
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Passed through to MarkdownEditor; defaults on. */
  mentions?: boolean;
}

let {
  value = $bindable(''),
  label,
  hint = '',
  placeholder = '',
  disabled = false,
  mentions = true,
}: Props = $props();

// Unique per instance so two fields in one form don't collide.
const labelId = $props.id();
</script>

<div>
  <!-- Field label, associated to the editor via aria-labelledby. The editor
       box is large and click/tab focusable, so no label click-to-focus
       handler (which would need a role + a11y suppression on a static span). -->
  <span id={labelId} class="block text-sm font-body font-medium text-gray-700 mb-1">
    {label}{#if hint} <span class="text-gray-400">{hint}</span>{/if}
  </span>
  <MarkdownEditor bind:value labelledBy={labelId} {placeholder} {disabled} {mentions} />
</div>
