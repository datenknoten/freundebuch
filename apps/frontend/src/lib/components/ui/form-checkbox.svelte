<script lang="ts">
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

let { id, label, checked = $bindable(), disabled = false }: Props = $props();
</script>

<div class="flex items-center gap-2">
  <input
    {id}
    type="checkbox"
    bind:checked
    {disabled}
    class={formClasses.checkbox}
  />
  <label for={id} class={formClasses.checkboxLabel}>
    {label}
  </label>
</div>
