<script lang="ts">
import { formClasses } from './styles';

interface Props {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  /** Called with the new state. Use instead of `bind:checked` when the change must be persisted. */
  onchange?: (checked: boolean) => void;
}

let { id, label, checked = $bindable(), disabled = false, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2">
  <input
    {id}
    type="checkbox"
    bind:checked
    {disabled}
    onchange={(event) => onchange?.(event.currentTarget.checked)}
    class={formClasses.checkbox}
  />
  <label for={id} class={formClasses.checkboxLabel}>
    {label}
  </label>
</div>
