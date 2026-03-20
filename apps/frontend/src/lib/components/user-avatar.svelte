<script lang="ts">
interface Props {
  email: string;
  size?: 'sm' | 'md';
}

let { email, size = 'md' }: Props = $props();

function getInitial(email: string): string {
  const localPart = email.split('@')[0];
  if (!localPart) return '?';
  return localPart[0].toUpperCase();
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
};

const initial = $derived(getInitial(email));
</script>

<div
  class="rounded-full bg-sage flex items-center justify-center text-white font-heading font-bold {sizeClasses[size]}"
  role="img"
  aria-label="User avatar for {email}"
>
  {initial}
</div>
