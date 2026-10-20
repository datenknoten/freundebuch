<script lang="ts">
import Plus from 'svelte-heros-v2/Plus.svelte';
// biome-ignore lint/correctness/useImportExtensions: a stylesheet, not a module; its fix would rewrite it to `.js`
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

const i18n = createI18n();

async function initializeApp() {
  // Auth first: its user preferences pick the initial locale.
  const user = await auth.initialize();
  await locale.initialize(user?.preferences?.language);
}
onMount(initializeApp);

// Preload circles when the user is authenticated. The circles store caches
// the result, so this only fetches once and is shared by every consumer
// (circles page, circle picker, etc.). We defer the preload off the critical
// path so it doesn't compete with the current page's initial data requests
// (e.g. the dashboard's consolidated request).
let circlesPreloaded = false;
function preloadIfStillAuthenticated() {
  // Re-check auth: the user may have logged out (or the session may have
  // expired) between scheduling and this callback firing, in which case we
  // must not issue an unauthenticated request.
  if (get(isAuthenticated) === true) {
    void circles.preloadCircles();
  }
}

function syncCirclesPreload() {
  if ($isAuthInitialized === false) {
    return;
  }

  if ($isAuthenticated === true) {
    if (circlesPreloaded === true) {
      return;
    }
    circlesPreloaded = true;
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(preloadIfStillAuthenticated);
    } else {
      setTimeout(preloadIfStillAuthenticated, 0);
    }
  } else {
    // On logout/session loss, drop the previous user's cached circles and
    // re-arm the preload so a subsequent login fetches a fresh set.
    circlesPreloaded = false;
    circles.clear();
  }
}
$effect(syncCirclesPreload);

// Sync language when user preferences change (e.g., after login)
function syncPreferredLanguage() {
  const prefs = $userPreferences;
  if (
    $isLocaleInitialized === true &&
    prefs?.language !== undefined &&
    prefs.language !== locale.getLanguage()
  ) {
    void locale.setLanguage(prefs.language);
  }
}
$effect(syncPreferredLanguage);

// Keep the document language in sync with the active locale. `app.html` ships
// a static `lang="en"`, which would otherwise make screen readers pronounce
// German content with English phonetics.
function syncDocumentLanguage() {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = $currentLanguage;
}
$effect(syncDocumentLanguage);

// Routes exempt from onboarding redirect. `/oauth/` is exempt so the OAuth
// consent step is not interrupted mid-flow (which would drop the consent code).
const onboardingExemptPaths = ['/onboarding', '/auth/', '/oauth/'];

function isOnboardingExempt(pathname: string) {
  return onboardingExemptPaths.some((path) => pathname.startsWith(path));
}

function redirectToOnboarding() {
  if ($isAuthInitialized === true && $needsOnboarding === true) {
    if (isOnboardingExempt($page.url.pathname) === false) {
      void goto('/onboarding');
    }
  }
}
$effect(redirectToOnboarding);

// Hide the FAB while the user is creating a new entity (any /new route, e.g.
// /friends/new, /encounters/new, /collectives/new) so an accidental tap can't
// interrupt them, and on friend/collective detail pages (which render their own
// FAB with a contextual "add detail" entry). The onboarding-exempt routes hide
// it too: every create target is behind the onboarding guard, so the FAB would
// only bounce the user straight back.
const showFab = $derived(
  $isAuthenticated === true &&
    isOnboardingExempt($page.url.pathname) === false &&
    $page.url.pathname.endsWith('/new') === false &&
    $page.url.pathname.match(/^\/friends\/[^/]+$/) === null &&
    $page.url.pathname.match(/^\/collectives\/[^/]+$/) === null,
);

let createMenuOpen = $state(false);

// Close the create menu on any navigation (incl. browser back/forward and
// query-param-only updates) so the bottom-sheet overlay can never linger on a
// route where the FAB is hidden.
let lastHref = $page.url.href;
function closeCreateMenuOnNavigation() {
  if ($page.url.href !== lastHref) {
    lastHref = $page.url.href;
    createMenuOpen = false;
  }
}
$effect(closeCreateMenuOnNavigation);

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
