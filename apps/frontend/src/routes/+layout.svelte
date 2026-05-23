<script lang="ts">
import Plus from 'svelte-heros-v2/Plus.svelte';
import '../app.css';
import type { Snippet } from 'svelte';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { longPress } from '$lib/actions/long-press';
import FabCreateMenu, {
  type FabCreateChoice,
  navigateForCreateChoice,
} from '$lib/components/fab-create-menu.svelte';
import Footer from '$lib/components/footer.svelte';
import GlobalSearch from '$lib/components/global-search.svelte';
import NavBar from '$lib/components/nav-bar.svelte';
import type { SupportedLanguage } from '$lib/i18n/index.js';
import { createI18n } from '$lib/i18n/index.js';
import { KeyboardShortcuts } from '$lib/shortcuts';
import {
  auth,
  isAuthenticated,
  isAuthInitialized,
  needsOnboarding,
  userPreferences,
} from '$lib/stores/auth';
import { circles } from '$lib/stores/circles';
import { isLocaleInitialized, locale } from '$lib/stores/locale';

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
  if ($isLocaleInitialized && prefs?.language && prefs.language !== locale.getLanguage()) {
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

let createMenuOpen = $state(false);

// Close the create menu on navigation (incl. browser back/forward) so the
// bottom-sheet overlay can never linger on a route where the FAB is hidden.
let lastPath = $page.url.pathname;
$effect(() => {
  if ($page.url.pathname !== lastPath) {
    lastPath = $page.url.pathname;
    createMenuOpen = false;
  }
});

function handleCreateSelect(choice: FabCreateChoice) {
  createMenuOpen = false;
  navigateForCreateChoice(choice);
}
</script>

<KeyboardShortcuts />
<GlobalSearch />

<div class="min-h-screen flex flex-col">
	<NavBar />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />

	<!-- Floating Action Button for mobile: tap = new friend, long-press = create menu -->
	{#if showFab}
		<button
			type="button"
			use:longPress={{
				onShort: () => goto('/friends/new'),
				onLong: () => (createMenuOpen = true),
			}}
			class="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-forest text-white rounded-full shadow-lg hover:bg-forest-light transition-colors flex items-center justify-center z-50 select-none touch-none [-webkit-touch-callout:none]"
			title={$i18n.t('friends.addNew')}
			aria-label={$i18n.t('friends.addNew')}
		>
			<Plus class="w-6 h-6" strokeWidth="2" />
		</button>
	{/if}

	{#if showFab && createMenuOpen}
		<FabCreateMenu onSelect={handleCreateSelect} onClose={() => (createMenuOpen = false)} />
	{/if}
</div>
