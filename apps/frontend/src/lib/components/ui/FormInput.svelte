<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  autofocus?: boolean;
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
}: Props = $props();
</script>

<div>
  <label for={id} class={formClasses.label}>
    {label}
    {#if required}<span class="text-red-500" aria-hidden="true">*</span>{/if}
    {#if optional}<span class="text-gray-400">({optionalText})</span>{/if}
  </label>
  <input
    use:autoFocus={autofocus}
    {id}
    {type}
    bind:value
    {disabled}
    {placeholder}
    class={formClasses.input}
    required={required}
  />
</div>
