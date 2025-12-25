<script lang="ts">
import ContactForm from '$lib/components/contacts/ContactForm.svelte';
</script>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-2xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="mb-8">
        <a
          href="/contacts"
          class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1 mb-4"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Contacts
        </a>
        <h1 class="text-3xl font-heading text-forest">New Contact</h1>
        <p class="text-gray-600 font-body mt-1">Add a new person to your contacts</p>
      </div>

      <ContactForm />
    </div>
  </div>
</div>
