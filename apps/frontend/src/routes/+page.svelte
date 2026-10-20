<script lang="ts">
import Heart from 'svelte-heros-v2/Heart.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import ShieldCheck from 'svelte-heros-v2/ShieldCheck.svelte';
import Sparkles from 'svelte-heros-v2/Sparkles.svelte';
import Star from 'svelte-heros-v2/Star.svelte';
import UserGroup from 'svelte-heros-v2/UserGroup.svelte';
import { getAppContext } from '$lib/app-context.js';
import NetworkGraph from '$lib/components/dashboard/NetworkGraph.svelte';
import UpcomingDates from '$lib/components/dashboard/UpcomingDates.svelte';
import Button from '$lib/components/ui/Button.svelte';
import { HEADING_CLASSES } from '$lib/components/ui/heading-classes.js';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type { NetworkGraphResponse, UpcomingDateResponse } from '$shared';

const friendsApi = getAppContext().api.friends;
const auth = getAppContext().stores.auth;
const currentUser = auth.currentUser;
const isAuthenticated = auth.isAuthenticated;
const isAuthInitialized = auth.isInitialized;
const signupEnabled = getAppContext().stores.instance.signupEnabled;

const i18n = createI18n();

// The self-profile display name is provided by /api/auth/me (via the auth
// store), so no extra request is needed to greet the user by name.
function greetingName() {
  const user = $currentUser;
  if (user === null || user === undefined) {
    return '';
  }
  if (user.displayName !== undefined && user.displayName !== '') {
    return user.displayName;
  }
  return user.email;
}
let userDisplayName = $derived.by(greetingName);

// Dashboard widgets share a single request via /api/friends/dashboard rather
// than each fetching independently.
const UPCOMING_DAYS = 30;
const UPCOMING_LIMIT = 10;

let upcomingDates = $state<UpcomingDateResponse[]>([]);
let networkGraph = $state<NetworkGraphResponse | null>(null);
let isDashboardLoading = $state(true);
let dashboardError = $state<string | null>(null);
let dashboardLoaded = false;

function loadDashboardWhenAuthenticated() {
  if ($isAuthInitialized === false) {
    return;
  }

  if ($isAuthenticated === true) {
    if (dashboardLoaded === true) {
      return;
    }
    dashboardLoaded = true;
    void loadDashboard();
  } else {
    // Reset so re-authentication in the same SPA session reloads the dashboard
    // instead of showing the previous (or empty) state.
    dashboardLoaded = false;
  }
}
$effect(loadDashboardWhenAuthenticated);

async function loadDashboard() {
  isDashboardLoading = true;
  dashboardError = null;
  try {
    const data = await friendsApi.getDashboard({ days: UPCOMING_DAYS, limit: UPCOMING_LIMIT });
    upcomingDates = data.upcomingDates;
    networkGraph = data.networkGraph;
  } catch (err) {
    dashboardError = err instanceof Error ? err.message : 'Failed to load dashboard';
  } finally {
    isDashboardLoading = false;
  }
}
</script>

<svelte:head>
	<title>{$i18n.t('nav.home')} | Freundebuch</title>
</svelte:head>

{#if $isAuthInitialized && $isAuthenticated && $currentUser !== null}
	<PageShell width="list" title={$i18n.t('home.welcomeBack', { name: userDisplayName })}>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<UpcomingDates
				{upcomingDates}
				isLoading={isDashboardLoading}
				error={dashboardError}
				onRetry={loadDashboard}
				days={UPCOMING_DAYS}
				limit={UPCOMING_LIMIT}
			/>
			<div class={SURFACE_CLASSES.page}>
				<h2 class="{HEADING_CLASSES.widget} mb-4">{$i18n.t('home.quickActions')}</h2>
				<div class="space-y-3">
					<Button href="/friends/new" block class="justify-start">
						<Plus class="w-5 h-5" strokeWidth="2" />
						{$i18n.t('home.addNewFriend')}
					</Button>
					<Button href="/friends" variant="secondary" block class="justify-start">
						<UserGroup class="w-5 h-5" strokeWidth="2" />
						{$i18n.t('home.viewAllFriends')}
					</Button>
				</div>
			</div>
			<div class="lg:col-span-2">
				<NetworkGraph graphData={networkGraph} isLoading={isDashboardLoading} error={dashboardError} onRetry={loadDashboard} />
			</div>
		</div>
	</PageShell>
{:else}
	<div class="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
		<div class="text-center max-w-7xl mx-auto">
			{#if !$isAuthInitialized}
				<!-- Loading state while auth initializes - prevents flash of unauthenticated content -->
				<h1 class="text-6xl font-heading text-forest mb-4">Freundebuch</h1>
				<div class="animate-pulse">
					<div class="h-8 bg-gray-200 rounded w-64 mx-auto mb-8"></div>
					<div class={SURFACE_CLASSES.page}>
						<div class="h-10 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
						<div class="h-6 bg-gray-200 rounded w-72 mx-auto"></div>
					</div>
				</div>
			{:else}
				<!-- Logo -->
				<div class="mb-6">
					<img
						src="/logo.png"
						alt={$i18n.t('home.hero.imageAlt')}
						class="max-w-md w-full h-auto mx-auto"
					/>
				</div>

				<h1 class="text-6xl font-heading text-forest mb-4">Freundebuch</h1>
				<p class="text-xl font-body text-gray-700 mb-10">
					{$i18n.t('home.tagline')}
				</p>

				<div class="{SURFACE_CLASSES.page} mb-8 text-left">
					<h2 class="text-3xl font-heading text-gray-800 mb-6 text-center">
						{$i18n.t('home.hero.title')}
					</h2>
					<div class="space-y-4 font-body text-gray-700">
						<p>
							{$i18n.t('home.hero.description')}
						</p>
						<div class="grid md:grid-cols-2 gap-4 mt-6">
							<div class="flex items-start gap-3">
								<Heart class="w-6 h-6 shrink-0 text-forest" strokeWidth="2" />
								<div>
									<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.remember.title')}</h3>
									<p class="text-sm text-gray-600">{$i18n.t('home.features.remember.description')}</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<Star class="w-6 h-6 shrink-0 text-forest" strokeWidth="2" />
								<div>
									<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.stayInTouch.title')}</h3>
									<p class="text-sm text-gray-600">{$i18n.t('home.features.stayInTouch.description')}</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<Sparkles class="w-6 h-6 shrink-0 text-forest" strokeWidth="2" />
								<div>
									<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.nurture.title')}</h3>
									<p class="text-sm text-gray-600">{$i18n.t('home.features.nurture.description')}</p>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ShieldCheck class="w-6 h-6 shrink-0 text-forest" strokeWidth="2" />
								<div>
									<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.privacy.title')}</h3>
									<p class="text-sm text-gray-600">{$i18n.t('home.features.privacy.description')}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="flex gap-4 justify-center">
					{#if $signupEnabled}
						<Button href="/auth/register" size="lg">{$i18n.t('home.hero.cta')}</Button>
					{/if}
					<Button href="/auth/login" variant="secondary" size="lg">
						{$i18n.t('home.hero.loginCta')}
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
