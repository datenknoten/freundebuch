<script lang="ts">
interface Props {
  displayName: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

let { displayName, photoUrl, size = 'md' }: Props = $props();

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) {
    return first.substring(0, 2).toUpperCase();
  }
  const last = parts.at(-1) ?? '';
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-24 h-24 text-2xl',
};

const initials = $derived(getInitials(displayName));
</script>

{#if photoUrl}
  <img
    src={photoUrl}
    alt={displayName}
    class="rounded-full object-cover {sizeClasses[size]}"
  />
{:else}
  <div
    class="rounded-full bg-sage flex items-center justify-center text-white font-heading font-bold {sizeClasses[size]}"
  >
    {initials}
  </div>
{/if}
