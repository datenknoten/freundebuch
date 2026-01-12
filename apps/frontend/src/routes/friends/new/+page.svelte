<script lang="ts">
import FriendForm from '$lib/components/friends/FriendForm.svelte';
</script>

<svelte:head>
  <title>New Friend | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="mb-8">
        <a
          href="/friends"
          class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1 mb-4"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Friends
        </a>
        <h1 class="text-3xl font-heading text-forest">New Friend</h1>
        <p class="text-gray-600 font-body mt-1">Add a new person to your friends</p>
      </div>

      <FriendForm />
    </div>
  </div>
</div>
