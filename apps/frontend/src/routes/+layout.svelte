<script lang="ts">
import '../app.css';
import { onMount } from 'svelte';
import NavBar from '$lib/components/NavBar.svelte';
import { auth } from '$lib/stores/auth';

// Initialize auth state on app load
onMount(async () => {
  await auth.initialize();
});
</script>

<div class="min-h-screen flex flex-col">
	<NavBar />
	<main class="flex-1">
		<slot />
	</main>
</div>
