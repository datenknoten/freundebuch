<script lang="ts">
import { goto } from '$app/navigation';
import { auth, currentUser, isAuthenticated } from '$lib/stores/auth';

async function handleLogout() {
  try {
    await auth.logout();
    goto('/auth/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
</script>

<nav class="bg-white border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<div class="flex items-center">
				<a href="/" class="text-2xl font-heading text-forest">
					Personal CRM
				</a>
			</div>

			<div class="flex items-center gap-4">
				{#if $isAuthenticated && $currentUser}
					<a
						href="/contacts/new"
						data-sveltekit-preload-data="tap"
						class="hidden sm:inline-flex items-center gap-1 bg-forest text-white px-3 py-1.5 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors text-sm"
						title="Add new contact (n)"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						New
					</a>
					<a
						href="/contacts"
						data-sveltekit-preload-data="tap"
						class="text-gray-700 hover:text-forest font-body font-semibold transition-colors"
					>
						Contacts
					</a>
					<a
						href="/profile"
						data-sveltekit-preload-data="tap"
						class="text-gray-700 hover:text-forest font-body font-semibold transition-colors"
					>
						Profile
					</a>
					<span class="text-gray-500 font-body text-sm">{$currentUser.email}</span>
					<button
						onclick={handleLogout}
						class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
					>
						Logout
					</button>
				{:else}
					<a
						href="/auth/login"
						class="text-gray-700 hover:text-forest font-body font-semibold transition-colors"
					>
						Sign in
					</a>
					<a
						href="/auth/register"
						class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
					>
						Sign up
					</a>
				{/if}
			</div>
		</div>
	</div>
</nav>
