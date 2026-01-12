<script lang="ts">
import { getFriend } from '$lib/api/friends';
import UpcomingDates from '$lib/components/dashboard/UpcomingDates.svelte';
import { currentUser, isAuthenticated, isAuthInitialized } from '$lib/stores/auth';

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
	<title>Home | Freundebuch</title>
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
				Welcome back, {userDisplayName}!
			</p>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
				<UpcomingDates days={30} limit={10} />
				<div class="bg-white rounded-xl shadow-lg p-6">
					<h3 class="text-xl font-heading text-gray-800 mb-4">Quick Actions</h3>
					<div class="space-y-3">
						<a
							href="/friends/new"
							class="flex items-center gap-3 p-3 rounded-lg bg-forest text-white hover:bg-forest-light transition-colors"
						>
							<span class="text-xl">+</span>
							<span class="font-body font-medium">Add New Friend</span>
						</a>
						<a
							href="/friends"
							class="flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
						>
							<span class="text-xl">&#128101;</span>
							<span class="font-body font-medium">View All Friends</span>
						</a>
					</div>
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
				Your personal memory book for the people who matter most
			</p>

			<div class="bg-white rounded-xl shadow-lg p-8 mb-8 text-left">
				<h2 class="text-3xl font-heading text-gray-800 mb-6 text-center">
					Keep Your Connections Alive
				</h2>
				<div class="space-y-4 font-body text-gray-700">
					<p>
						Life gets busy, but friendships shouldn't fade away. Freundebuch is your
						personal space to cherish relationships, remember the little details, and
						never miss an opportunity to connect with the people you care about.
					</p>
					<div class="grid md:grid-cols-2 gap-4 mt-6">
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#9829;</span>
							<div>
								<h3 class="font-semibold text-gray-800">Remember What Matters</h3>
								<p class="text-sm text-gray-600">Store birthdays, anniversaries, and personal notes about your loved ones</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#9734;</span>
							<div>
								<h3 class="font-semibold text-gray-800">Stay in Touch</h3>
								<p class="text-sm text-gray-600">Get gentle reminders when it's time to reach out to friends and family</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#9825;</span>
							<div>
								<h3 class="font-semibold text-gray-800">Nurture Relationships</h3>
								<p class="text-sm text-gray-600">Track your interactions and see how your connections grow over time</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-forest text-xl">&#10022;</span>
							<div>
								<h3 class="font-semibold text-gray-800">Your Data, Your Control</h3>
								<p class="text-sm text-gray-600">Self-hosted and private - sync across devices with CalDAV/CardDAV</p>
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
					Start Your Book
				</a>
				<a
					href="/auth/login"
					class="bg-white border-2 border-forest text-forest px-8 py-3 rounded-lg font-body font-semibold hover:bg-gray-50 transition-colors text-lg"
				>
					Sign In
				</a>
			</div>
		{/if}
	</div>
</div>
