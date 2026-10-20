<script lang="ts">
import ChatBubbleLeftRight from 'svelte-heros-v2/ChatBubbleLeftRight.svelte';
import Phone from 'svelte-heros-v2/Phone.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import VideoCamera from 'svelte-heros-v2/VideoCamera.svelte';
import type { EncounterType } from '$shared';

interface Props {
  type: EncounterType;
  class?: string;
  strokeWidth?: string;
}

let { type, class: className = 'w-4 h-4', strokeWidth = '2' }: Props = $props();

const icons = {
  in_person: Users,
  phone_call: Phone,
  video_call: VideoCamera,
  message: ChatBubbleLeftRight,
};

let Icon = $derived(icons[type]);
</script>

<Icon class={className} {strokeWidth} />
