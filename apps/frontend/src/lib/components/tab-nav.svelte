<script lang="ts" generics="Id extends string">
import { focusRing } from '$lib/components/ui';

interface Props {
  tabs: { id: Id; label: string }[];
  /** Id of the currently selected tab. */
  active: Id;
  onselect: (id: Id) => void;
  /** Labels the tablist when no adjacent heading names the group. */
  ariaLabel?: string;
}

let { tabs, active, onselect, ariaLabel }: Props = $props();

let buttons = $state<(HTMLButtonElement | null)[]>([]);

/**
 * A tablist is a single tab stop, so the arrow keys have to move the selection -
 * without them the unselected tabs are unreachable by keyboard.
 */
function handleKeydown(event: KeyboardEvent) {
  const current = tabs.findIndex((tab) => tab.id === active);
  if (current === -1) return;

  let next: number;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (current + 1) % tabs.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    next = (current - 1 + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = tabs.length - 1;
  } else {
    return;
  }

  const target = tabs[next];
  if (target === undefined) return;
  event.preventDefault();
  onselect(target.id);
  buttons[next]?.focus();
}
</script>

<div
  role="tablist"
  aria-label={ariaLabel}
  class="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap"
>
  {#each tabs as tab, index (tab.id)}
    {@const selected = tab.id === active}
    <button
      bind:this={buttons[index]}
      type="button"
      role="tab"
      id="tab-{tab.id}"
      aria-selected={selected}
      aria-controls={selected ? `tabpanel-${tab.id}` : undefined}
      tabindex={selected ? 0 : -1}
      onclick={() => onselect(tab.id)}
      onkeydown={handleKeydown}
      class="flex-1 shrink-0 px-4 py-3 font-body font-medium text-sm transition-colors {focusRing} {selected
        ? 'bg-white text-forest border-b-2 border-forest'
        : 'bg-gray-50 text-gray-600 hover:text-gray-800'}"
    >
      {tab.label}
    </button>
  {/each}
</div>
