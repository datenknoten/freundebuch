<script lang="ts">
import Plus from 'svelte-heros-v2/Plus.svelte';
import '../app.css';
import type { Snippet } from 'svelte';
import { onMount, untrack } from 'svelte';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { setAppContext } from '$lib/app-context.js';
import FabCreateMenu, {
  type FabCreateChoice,
  navigateForCreateChoice,
} from '$lib/components/FabCreateMenu.svelte';
import Footer from '$lib/components/Footer.svelte';
import GlobalSearch from '$lib/components/GlobalSearch.svelte';
import NavBar from '$lib/components/NavBar.svelte';
import SessionExpiredModal from '$lib/components/SessionExpiredModal.svelte';
import Fab from '$lib/components/ui/Fab.svelte';
import { createAppContext } from '$lib/create-app-context.js';
import { createI18n } from '$lib/i18n/i18n.js';
import KeyboardShortcuts from '$lib/shortcuts/KeyboardShortcuts.svelte';
import type { LayoutData } from './$types';

interface Props {
  children: Snippet;
  data: LayoutData;
}

let { children, data }: Props = $props();

// Built once per page lifetime: a rerun of the root load must not replace the stores' state.
const appContext = createAppContext(untrack(() => data.config));
setAppContext(appContext);
const circles = appContext.stores.circles;
const auth = appContext.stores.auth;
const isAuthenticated = auth.isAuthenticated;
const isAuthInitialized = auth.isInitialized;
const needsOnboarding = auth.needsOnboarding;
const userPreferences = auth.preferences;
const locale = appContext.stores.locale;
const currentLanguage = locale.currentLanguage;
const isLocaleInitialized = locale.isInitialized;
const session = appContext.stores.session;

// Create i18n store for reactive translations
const i18n = createI18n();

// Initialize auth state and i18n on app load
onMount(async () => {
  // Initialize auth first to get user preferences
  const user = await auth.initialize();

  // Initialize locale with user's language preference if available
  await locale.initialize(user?.preferences?.language);
});

// Preload circles when the user is authenticated. The circles store caches
// the result, so this only fetches once and is shared by every consumer
// (circles page, circle picker, etc.). We defer the preload off the critical
// path so it doesn't compete with the current page's initial data requests
// (e.g. the dashboard's consolidated request).
let circlesPreloaded = false;
$effect(() => {
  if (!$isAuthInitialized) return;

  if ($isAuthenticated) {
    if (circlesPreloaded) return;
    circlesPreloaded = true;
    const preload = () => {
      // Re-check auth: the user may have logged out (or the session may have
      // expired) between scheduling and this callback firing, in which case we
      // must not issue an unauthenticated request.
      if (get(isAuthenticated)) void circles.preloadCircles();
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(preload);
    } else {
      setTimeout(preload, 0);
    }
  } else {
    // On logout/session loss, drop the previous user's cached circles and
    // re-arm the preload so a subsequent login fetches a fresh set.
    circlesPreloaded = false;
    circles.clear();
  }
});

// Sync language when user preferences change (e.g., after login)
$effect(() => {
  const prefs = $userPreferences;
  if ($isLocaleInitialized && prefs?.language && prefs.language !== locale.getLanguage()) {
    locale.setLanguage(prefs.language);
  }
});

// Keep the document language in sync with the active locale. `app.html` ships
// a static `lang="en"`, which would otherwise make screen readers pronounce
// German content with English phonetics.
$effect(() => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = $currentLanguage;
});

// Routes exempt from onboarding redirect. `/oauth/` is exempt so the OAuth
// consent step is not interrupted mid-flow (which would drop the consent code).
const onboardingExemptPaths = ['/onboarding', '/auth/', '/oauth/'];

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

// Hide the FAB while the user is creating a new entity (any /new route, e.g.
// /friends/new, /encounters/new, /collectives/new) so an accidental tap can't
// interrupt them, and on friend/collective detail pages (which render their own
// FAB with a contextual "add detail" entry). The onboarding-exempt routes hide
// it too: every create target is behind the onboarding guard, so the FAB would
// only bounce the user straight back.
const showFab = $derived(
  $isAuthenticated &&
    !onboardingExemptPaths.some((path) => $page.url.pathname.startsWith(path)) &&
    !$page.url.pathname.endsWith('/new') &&
    !$page.url.pathname.match(/^\/friends\/[^/]+$/) &&
    !$page.url.pathname.match(/^\/collectives\/[^/]+$/),
);

let createMenuOpen = $state(false);

// Close the create menu on any navigation (incl. browser back/forward and
// query-param-only updates) so the bottom-sheet overlay can never linger on a
// route where the FAB is hidden.
let lastHref = $page.url.href;
$effect(() => {
  if ($page.url.href !== lastHref) {
    lastHref = $page.url.href;
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
	<main class="flex-1 bg-gray-50 flex flex-col">
		{@render children()}
	</main>
	<Footer />

	<!-- Floating Action Button for mobile: tap = create menu -->
	{#if showFab}
		<Fab onclick={() => (createMenuOpen = true)} label={$i18n.t('common.createNew')}>
			<Plus class="w-6 h-6" strokeWidth="2" />
		</Fab>
	{/if}

	{#if showFab && createMenuOpen}
		<FabCreateMenu onSelect={handleCreateSelect} onClose={() => (createMenuOpen = false)} />
	{/if}

	<!-- Session-expired re-login prompt: shown when an API call returns 401 for a
	     previously-authenticated user, letting them re-authenticate in place. -->
	{#if $session}
		<SessionExpiredModal />
	{/if}
</div>
