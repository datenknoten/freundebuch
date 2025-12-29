<script lang="ts">
import { currentUser, isAuthenticated } from '$lib/stores/auth';
</script>

<svelte:head>
	<title>Home | Freundebuch</title>
</svelte:head>

<div class="bg-gray-50 flex items-center justify-center p-4 py-16">
	<div class="text-center max-w-4xl">
		<h1 class="text-6xl font-heading text-forest mb-4">Freundebuch</h1>

		{#if $isAuthenticated && $currentUser}
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
			<p class="text-xl font-body text-gray-700 mb-8">
				Your relationship assistant - never forget to reach out again
			</p>
			<div class="bg-white rounded-xl shadow-lg p-8 mb-8 text-left">
				<h2 class="text-3xl font-heading text-gray-800 mb-6 text-center">
					What is Freundebuch?
				</h2>
				<div class="space-y-4 font-body text-gray-700">
					<p>
						Think of this as your relationship assistant - a self-hostable web application
						designed to help individuals and families maintain meaningful connections.
					</p>
					<ul class="list-disc list-inside space-y-2 ml-4">
						<li>Track interactions with friends, family, and colleagues</li>
						<li>Set reminders to stay in touch with the people who matter</li>
						<li>Organize contacts with groups and tags</li>
						<li>Get insights into your relationship health</li>
						<li>Sync with your devices using CalDAV/CardDAV</li>
					</ul>
				</div>
			</div>
			<div class="flex gap-4 justify-center">
				<a
					href="/auth/register"
					class="bg-forest text-white px-8 py-3 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors text-lg"
				>
					Get Started
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
