<script lang="ts">
interface Props {
  displayName: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

let { displayName, photoUrl, size = 'md' }: Props = $props();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizeClasses = {
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
