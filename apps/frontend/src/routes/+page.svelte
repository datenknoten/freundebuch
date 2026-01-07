<script lang="ts">
import { currentUser, isAuthenticated, isAuthInitialized } from '$lib/stores/auth';
</script>

<svelte:head>
	<title>Home | Freundebuch</title>
</svelte:head>

<div class="bg-gray-50 flex items-center justify-center p-4 py-16">
	<div class="text-center max-w-4xl">
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
				Welcome back, {$currentUser.email}!
			</p>
			<div class="bg-white rounded-xl shadow-lg p-8 mb-8">
				<h2 class="text-3xl font-heading text-gray-800 mb-4">
					Your Relationship Dashboard
				</h2>
				<p class="text-lg font-body text-gray-600 mb-6">
					Contact management features coming soon!
				</p>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="p-6 bg-gray-50 rounded-lg">
						<div class="text-4xl font-heading text-forest mb-2">0</div>
						<div class="text-sm font-body text-gray-600">Contacts</div>
					</div>
					<div class="p-6 bg-gray-50 rounded-lg">
						<div class="text-4xl font-heading text-forest mb-2">0</div>
						<div class="text-sm font-body text-gray-600">Recent Interactions</div>
					</div>
					<div class="p-6 bg-gray-50 rounded-lg">
						<div class="text-4xl font-heading text-forest mb-2">0</div>
						<div class="text-sm font-body text-gray-600">Upcoming Reminders</div>
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

		<div class="mt-12 inline-flex items-center gap-2 px-6 py-3 bg-forest text-white rounded-lg">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="font-body">Authentication system complete - Contact management coming next!</span>
		</div>
	</div>
</div>
