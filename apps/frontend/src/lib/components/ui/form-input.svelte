<script lang="ts">
import { autoFocus } from '$lib/actions/auto-focus';
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'password' | 'number' | 'time';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  autofocus?: boolean;
  /** Validation message; also marks the control invalid. */
  error?: string;
  /** Static hint (format, password rules) rendered below the control. */
  helper?: string;
  size?: 'md' | 'sm';
}

let {
  id,
  label,
  value = $bindable(),
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  optional = false,
  optionalText = '',
  autofocus = false,
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
  <input
    use:autoFocus={autofocus}
    {id}
    {type}
    bind:value
    {disabled}
    {placeholder}
    class="{size === 'sm' ? formClasses.inputSm : formClasses.input}{error !== undefined
      ? ` ${formClasses.inputError}`
      : ''}"
    required={required}
    aria-invalid={error !== undefined ? 'true' : undefined}
    aria-describedby={describedBy.length > 0 ? describedBy : undefined}
  />
  {#if helper !== undefined}
    <p id="{id}-helper" class={formClasses.helper}>{helper}</p>
  {/if}
  {#if error !== undefined}
    <p id="{id}-error" class={formClasses.error}>{error}</p>
  {/if}
</div>
