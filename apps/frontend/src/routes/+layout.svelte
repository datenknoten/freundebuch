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
import type { SupportedLanguage } from '$lib/i18n/index.js';
import { createI18n } from '$lib/i18n/index.js';
import {
  auth,
  isAuthenticated,
  isAuthInitialized,
  needsOnboarding,
  userPreferences,
} from '$lib/stores/auth';
import { circles } from '$lib/stores/circles';
import { locale } from '$lib/stores/locale';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

// Create i18n store for reactive translations
const i18n = createI18n();

// Initialize auth state and i18n on app load
onMount(async () => {
  // Initialize auth first to get user preferences
  const authResult = await auth.initialize();

  // Initialize locale with user's language preference if available
  const userLanguage = authResult?.user?.preferences?.language as SupportedLanguage | undefined;
  await locale.initialize(userLanguage);
});

// Load circles when user is authenticated
let circlesLoaded = false;
$effect(() => {
  if ($isAuthInitialized && $isAuthenticated && !circlesLoaded) {
    circlesLoaded = true;
    circles.loadCircles();
  }
});

// Sync language when user preferences change (e.g., after login)
$effect(() => {
  const prefs = $userPreferences;
  if (prefs?.language && prefs.language !== locale.getLanguage()) {
    locale.setLanguage(prefs.language as SupportedLanguage);
  }
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

// Hide FAB on new friend page and friend detail pages (which have their own FAB)
const showFab = $derived(
  $isAuthenticated &&
    !$page.url.pathname.includes('/friends/new') &&
    !$page.url.pathname.match(/^\/friends\/[^/]+$/),
);
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
			href="/friends/new"
			data-sveltekit-preload-data="tap"
			class="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-forest text-white rounded-full shadow-lg hover:bg-forest-light transition-colors flex items-center justify-center z-50"
			title={$i18n.t('friends.addNew')}
			aria-label={$i18n.t('friends.addNew')}
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</a>
	{/if}
</div>
