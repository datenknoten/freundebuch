<script lang="ts">
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  value: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  /** Validation message; also marks the control invalid. */
  error?: string;
  /** Static hint rendered below the control. */
  helper?: string;
  size?: 'md' | 'sm';
}

let {
  id,
  label,
  value = $bindable(),
  rows = 2,
  placeholder,
  disabled = false,
  required = false,
  optional = false,
  optionalText = '',
  error,
  helper,
  size = 'md',
}: Props = $props();

const describedBy = $derived(
  [error !== undefined ? `${id}-error` : null, helper !== undefined ? `${id}-helper` : null]
    .filter((part) => part !== null)
    .join(' '),
);
</script>

<div>
  <label for={id} class={formClasses.label}>
    {label}
    {#if required}<span class="text-red-500" aria-hidden="true">*</span>{/if}
    {#if optional && optionalText.length > 0}<span class="text-gray-400">({optionalText})</span>{/if}
  </label>
  <textarea
    {id}
    bind:value
    {rows}
    {disabled}
    {placeholder}
    class="{size === 'sm' ? `${formClasses.inputSm} resize-none` : formClasses.textarea}{error !==
    undefined
      ? ` ${formClasses.inputError}`
      : ''}"
    required={required}
    aria-invalid={error !== undefined ? 'true' : undefined}
    aria-describedby={describedBy.length > 0 ? describedBy : undefined}
  ></textarea>
  {#if helper !== undefined}
    <p id="{id}-helper" class={formClasses.helper}>{helper}</p>
  {/if}
  {#if error !== undefined}
    <p id="{id}-error" class={formClasses.error}>{error}</p>
  {/if}
</div>
