<script lang="ts">
import * as authApi from '$lib/api/auth';
import { currentUser } from '$lib/stores/auth';

const pageTitle = $derived(
  $currentUser?.email ? `${$currentUser.email} | Freundebuch` : 'Profile | Freundebuch',
);

let isEditing = $state(false);
let email = $state($currentUser?.email || '');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault();
  error = '';
  success = false;
  isLoading = true;

  try {
    await authApi.updateCurrentUser({ email });
    success = true;
    isEditing = false;
    isLoading = false;

    // Hide success message after 3 seconds
    setTimeout(() => {
      success = false;
    }, 3000);
  } catch (err) {
    error = (err as Error)?.message || 'Failed to update profile';
    isLoading = false;
  }
}

function handleCancel() {
  email = $currentUser?.email || '';
  isEditing = false;
  error = '';
}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="max-w-2xl mx-auto mt-8">
		<div class="bg-white rounded-xl shadow-lg p-8">
			<div class="flex justify-between items-start mb-6">
				<div>
					<h1 class="text-3xl font-heading text-forest mb-2">Your Profile</h1>
					<p class="text-gray-600 font-body">Manage your account settings</p>
				</div>
				{#if !isEditing}
					<button
						onclick={() => (isEditing = true)}
						class="bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
					>
						Edit Profile
					</button>
				{/if}
			</div>

			{#if error}
				<div
					class="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm"
					role="alert"
				>
					{error}
				</div>
			{/if}

			{#if success}
				<div
					class="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg font-body text-sm"
					role="alert"
				>
					Profile updated successfully!
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<label for="user-id" class="block text-sm font-body font-semibold text-gray-700 mb-2">
						User ID
					</label>
					<input
						type="text"
						id="user-id"
						value={$currentUser?.externalId || ''}
						disabled
						class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-body text-gray-600"
					/>
					<p class="mt-1 text-xs font-body text-gray-500">Your unique user identifier</p>
				</div>

				<div>
					<label for="email" class="block text-sm font-body font-semibold text-gray-700 mb-2">
						Email address
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						required
						disabled={!isEditing || isLoading}
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body disabled:bg-gray-100 disabled:text-gray-600"
					/>
				</div>

				{#if $currentUser?.createdAt}
					<div>
						<p class="block text-sm font-body font-semibold text-gray-700 mb-2">
							Member since
						</p>
						<p class="font-body text-gray-600">
							{new Date($currentUser.createdAt).toLocaleDateString('en-US')}
						</p>
					</div>
				{/if}

				{#if isEditing}
					<div class="flex gap-3">
						<button
							type="submit"
							disabled={isLoading}
							class="flex-1 bg-forest text-white py-3 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Saving...' : 'Save Changes'}
						</button>
						<button
							type="button"
							onclick={handleCancel}
							disabled={isLoading}
							class="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-body font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
					</div>
				{/if}
			</form>

			<div class="mt-8 pt-8 border-t border-gray-200">
				<h2 class="text-xl font-heading text-gray-800 mb-4">Security</h2>
				<p class="text-sm font-body text-gray-600 mb-4">
					Password management and security settings coming soon!
				</p>
			</div>
		</div>
	</div>
</div>
