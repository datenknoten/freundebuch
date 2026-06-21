<script lang="ts">
import LockClosed from 'svelte-heros-v2/LockClosed.svelte';
import { goto } from '$app/navigation';
import LoginForm from '$lib/components/login-form.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { auth, currentUser } from '$lib/stores/auth';
import { abandonSessionExpired } from '$lib/stores/session';
import { isModalOpen } from '$lib/stores/ui';

const i18n = createI18n();

// Pre-fill the email of the user whose session expired so re-login is one tap
// (password / passkey) away.
const email = $derived($currentUser?.email ?? '');

let isLoggingOut = $state(false);

// Suppress global keyboard shortcuts while the prompt is open.
$effect(() => {
  isModalOpen.set(true);
  return () => isModalOpen.set(false);
});

// Trap Escape so the user can't dismiss an expired session into a broken state;
// the only ways forward are to re-authenticate or explicitly log out.
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
  }
}

// Re-login succeeded: the auth store already dismissed the prompt and released
// any parked requests, so there's nothing left to do here (just don't navigate
// away — keep the user on their current page).
function handleReauthenticated() {}

async function handleLogout() {
  isLoggingOut = true;
  try {
    await auth.logout();
  } catch {
    // Best effort: even if the sign-out request fails, the session is already
    // gone client-side, so drop the prompt and head to a clean login page.
  } finally {
    // Ensure the prompt is dismissed and parked requests reject regardless of
    // how the sign-out request resolved.
    abandonSessionExpired();
    await goto('/auth/login');
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal backdrop. Intentionally not dismissible by backdrop click: the
     session is gone, so re-authentication (or logout) is the only path forward. -->
<div
  class="fixed inset-0 bg-gray-900/50 z-[60] flex items-center justify-center p-4"
  role="dialog"
  aria-modal="true"
  aria-labelledby="session-expired-title"
  tabindex="-1"
>
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8">
    <!-- Explanatory banner -->
    <div class="flex items-start gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <LockClosed class="w-6 h-6 text-amber-500 flex-shrink-0" strokeWidth="2" />
      <div>
        <h2 id="session-expired-title" class="font-heading text-forest mb-1">
          {$i18n.t('auth.sessionExpired.title')}
        </h2>
        <p class="text-sm font-body text-gray-600">
          {$i18n.t('auth.sessionExpired.message')}
        </p>
      </div>
    </div>

    <LoginForm initialEmail={email} onSuccess={handleReauthenticated} />

    <div class="mt-6 pt-6 border-t border-gray-200 text-center">
      <button
        type="button"
        onclick={handleLogout}
        disabled={isLoggingOut}
        class="text-sm font-body font-semibold text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoggingOut ? $i18n.t('common.loading') : $i18n.t('auth.sessionExpired.logout')}
      </button>
    </div>
  </div>
</div>
