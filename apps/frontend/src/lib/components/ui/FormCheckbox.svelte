<script lang="ts">
import { FORM_CLASSES } from './form-classes.js';

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
    class={FORM_CLASSES.checkbox}
  />
  <label for={id} class={FORM_CLASSES.checkboxLabel}>
    {label}
  </label>
</div>
