<script lang="ts">
import LoginForm from '$lib/components/LoginForm.svelte';
</script>

<svelte:head>
	<title>Sign In | Personal CRM</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
		<LoginForm />
	</div>
</div>
