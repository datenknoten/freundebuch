<script lang="ts">
import { getFriend } from '$lib/api/friends';
import NetworkGraph from '$lib/components/dashboard/NetworkGraph.svelte';
import UpcomingDates from '$lib/components/dashboard/UpcomingDates.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser, isAuthenticated, isAuthInitialized } from '$lib/stores/auth';

const i18n = createI18n();

let displayName = $state<string | null>(null);
let lastFetchedId = $state<string | null>(null);
let userDisplayName = $derived(displayName || $currentUser?.email || '');

$effect(() => {
  const selfProfileId = $currentUser?.selfProfileId;
  // Only fetch when selfProfileId changes to a new value
  // This prevents duplicate fetches and handles user switching properly
  if (selfProfileId && selfProfileId !== lastFetchedId) {
    lastFetchedId = selfProfileId;
    fetchDisplayName(selfProfileId);
  }
});

async function fetchDisplayName(selfProfileId: string) {
  try {
    const friend = await getFriend(selfProfileId);
    displayName = friend.displayName;
  } catch (error) {
    console.warn('Failed to fetch self-profile for display name:', error);
    displayName = null;
  }
}
</script>

<svelte:head>
	<title>{$i18n.t('nav.home')} | Freundebuch</title>
</svelte:head>

<div class="bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
	<div class="text-center max-w-7xl mx-auto">
		{#if !$isAuthInitialized}
			<!-- Loading state while auth initializes - prevents flash of unauthenticated content -->
			<h1 class="text-6xl font-heading text-forest mb-4">Freundebuch</h1>
			<div class="animate-pulse">
				<div class="h-8 bg-gray-200 rounded w-64 mx-auto mb-8"></div>
				<div class="bg-white rounded-xl shadow-lg p-8 mb-8">
					<div class="h-10 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
					<div class="h-6 bg-gray-200 rounded w-72 mx-auto"></div>
				</div>
			</div>
		{:else if $isAuthenticated && $currentUser}
			<h1 class="text-6xl font-heading text-forest mb-4">Freundebuch</h1>
			<p class="text-2xl font-body text-gray-700 mb-8">
				{$i18n.t('home.welcomeBack', { name: userDisplayName })}
			</p>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left max-w-6xl mx-auto">
				<UpcomingDates days={30} limit={10} />
				<div class="bg-white rounded-xl shadow-lg p-6">
					<h3 class="text-xl font-heading text-gray-800 mb-4">{$i18n.t('home.quickActions')}</h3>
					<div class="space-y-3">
						<a
							href="/friends/new"
							class="flex items-center gap-3 p-3 rounded-lg bg-forest text-white hover:bg-forest-light transition-colors"
						>
							<span class="text-xl">+</span>
							<span class="font-body font-medium">{$i18n.t('home.addNewFriend')}</span>
						</a>
						<a
							href="/friends"
							class="flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
						>
							<span class="text-xl">&#128101;</span>
							<span class="font-body font-medium">{$i18n.t('home.viewAllFriends')}</span>
						</a>
					</div>
				</div>
				<div class="lg:col-span-2">
					<NetworkGraph />
				</div>
			</div>
		{:else}
			<!-- Logo -->
			<div class="mb-6">
				<img
					src="/logo.png"
					alt="Freundebuch - An open book with memories"
					class="max-w-md w-full h-auto mx-auto"
				/>
			</div>

			<h1 class="text-6xl font-heading text-forest mb-4">Freundebuch</h1>
			<p class="text-xl font-body text-gray-700 mb-10">
				{$i18n.t('home.tagline')}
			</p>

			<div class="bg-white rounded-xl shadow-lg p-8 mb-8 text-left">
				<h2 class="text-3xl font-heading text-gray-800 mb-6 text-center">
					{$i18n.t('home.hero.title')}
				</h2>
				<div class="space-y-4 font-body text-gray-700">
					<p>
						{$i18n.t('home.hero.description')}
					</p>
					<div class="grid md:grid-cols-2 gap-4 mt-6">
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#9829;</span>
							<div>
								<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.remember.title')}</h3>
								<p class="text-sm text-gray-600">{$i18n.t('home.features.remember.description')}</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#9734;</span>
							<div>
								<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.stayInTouch.title')}</h3>
								<p class="text-sm text-gray-600">{$i18n.t('home.features.stayInTouch.description')}</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#9825;</span>
							<div>
								<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.nurture.title')}</h3>
								<p class="text-sm text-gray-600">{$i18n.t('home.features.nurture.description')}</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#10022;</span>
							<div>
								<h3 class="font-semibold text-gray-800">{$i18n.t('home.features.privacy.title')}</h3>
								<p class="text-sm text-gray-600">{$i18n.t('home.features.privacy.description')}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="flex gap-4 justify-center">
				<a
					href="/auth/register"
					class="bg-forest text-white px-8 py-3 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors text-lg"
				>
					{$i18n.t('home.hero.cta')}
				</a>
				<a
					href="/auth/login"
					class="bg-white border-2 border-forest text-forest px-8 py-3 rounded-lg font-body font-semibold hover:bg-gray-50 transition-colors text-lg"
				>
					{$i18n.t('home.hero.loginCta')}
				</a>
			</div>
		{/if}
	</div>
</div>
