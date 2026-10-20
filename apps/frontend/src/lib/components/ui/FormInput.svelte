<script lang="ts">
import type { HTMLInputAttributes } from 'svelte/elements';
import { autoFocus } from '$lib/actions/auto-focus';
import { FORM_CLASSES } from './form-classes.js';

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
  /** Browser autofill hint; auth forms rely on it for password managers and passkeys. */
  autocomplete?: HTMLInputAttributes['autocomplete'];
  /** Native minimum length, mirrored by server-side validation. */
  minlength?: number;
  /** Native maximum length, mirrored by server-side validation. */
  maxlength?: number;
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
  autocomplete,
  minlength,
  maxlength,
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
  <label for={id} class={FORM_CLASSES.label}>
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
    {autocomplete}
    {minlength}
    {maxlength}
    class="{size === 'sm' ? FORM_CLASSES.inputSm : FORM_CLASSES.input}{error !== undefined
      ? ` ${FORM_CLASSES.inputError}`
      : ''}"
    required={required}
    aria-invalid={error !== undefined ? 'true' : undefined}
    aria-describedby={describedBy.length > 0 ? describedBy : undefined}
  />
  {#if helper !== undefined}
    <p id="{id}-helper" class={FORM_CLASSES.helper}>{helper}</p>
  {/if}
  {#if error !== undefined}
    <p id="{id}-error" class={FORM_CLASSES.error}>{error}</p>
  {/if}
</div>
