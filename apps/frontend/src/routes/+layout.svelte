<script lang="ts">
import '../app.css';
import type { Snippet } from 'svelte';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import Footer from '$lib/components/Footer.svelte';
import GlobalSearch from '$lib/components/GlobalSearch.svelte';
import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
import NavBar from '$lib/components/NavBar.svelte';
import { auth, isAuthenticated, isAuthInitialized, needsOnboarding } from '$lib/stores/auth';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

// Initialize auth state on app load
onMount(async () => {
  await auth.initialize();
});

// Routes exempt from onboarding redirect
const onboardingExemptPaths = ['/onboarding', '/auth/'];

// Redirect to onboarding if user needs to complete it
$effect(() => {
  if ($isAuthInitialized && $needsOnboarding) {
    const currentPath = $page.url.pathname;
    const isExempt = onboardingExemptPaths.some((path) => currentPath.startsWith(path));
    if (!isExempt) {
      goto('/onboarding');
    }
  }
});

// Hide FAB on new contact page
const showFab = $derived($isAuthenticated && !$page.url.pathname.includes('/contacts/new'));
</script>

<KeyboardShortcuts />
<GlobalSearch />

<div class="min-h-screen flex flex-col">
	<NavBar />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />

	<!-- Floating Action Button for mobile -->
	{#if showFab}
		<a
			href="/contacts/new"
			data-sveltekit-preload-data="tap"
			class="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-forest text-white rounded-full shadow-lg hover:bg-forest-light transition-colors flex items-center justify-center z-50"
			title="Add new contact"
			aria-label="Add new contact"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</a>
	{/if}
</div>
