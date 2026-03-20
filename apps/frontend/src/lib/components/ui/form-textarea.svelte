<script lang="ts">
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  value: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}

let { id, label, value = $bindable(), rows = 2, placeholder, disabled = false }: Props = $props();
</script>

<div>
  <label for={id} class={formClasses.label}>
    {label}
  </label>
  <textarea
    {id}
    bind:value
    {rows}
    {disabled}
    {placeholder}
    class={formClasses.textarea}
  ></textarea>
</div>
