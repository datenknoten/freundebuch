<script lang="ts" generics="T extends string | number">
import { autoFocus } from '$lib/actions/autoFocus';
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
}: Props = $props();
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
    class={formClasses.select}
    required={required}
  >
    {#if placeholderOption}
      <option value="">{placeholderOption}</option>
    {/if}
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
