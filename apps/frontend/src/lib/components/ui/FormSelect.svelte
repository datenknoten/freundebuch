<script lang="ts" generics="T extends string | number">
import { autoFocus } from '$lib/actions/auto-focus';
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  required?: boolean;
  autofocus?: boolean;
  placeholderOption?: string;
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
  options,
  disabled = false,
  required = false,
  autofocus = false,
  placeholderOption,
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
  </label>
  <select
    use:autoFocus={autofocus}
    {id}
    bind:value
    {disabled}
    class="{size === 'sm' ? formClasses.inputSm : formClasses.select}{error !== undefined
      ? ` ${formClasses.inputError}`
      : ''}"
    required={required}
    aria-invalid={error !== undefined ? 'true' : undefined}
    aria-describedby={describedBy.length > 0 ? describedBy : undefined}
  >
    {#if placeholderOption !== undefined}
      <option value="">{placeholderOption}</option>
    {/if}
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
  {#if helper !== undefined}
    <p id="{id}-helper" class={formClasses.helper}>{helper}</p>
  {/if}
  {#if error !== undefined}
    <p id="{id}-error" class={formClasses.error}>{error}</p>
  {/if}
</div>
