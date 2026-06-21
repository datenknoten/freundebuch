<script lang="ts">
import LockClosed from 'svelte-heros-v2/LockClosed.svelte';
import LoginForm from '$lib/components/login-form.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';
import { clearSessionExpired } from '$lib/stores/session';
import { isModalOpen } from '$lib/stores/ui';

const i18n = createI18n();

// Pre-fill the email of the user whose session expired so re-login is one tap
// (password / passkey) away.
const email = $derived($currentUser?.email ?? '');

// Suppress global keyboard shortcuts while the prompt is open.
$effect(() => {
  isModalOpen.set(true);
  return () => isModalOpen.set(false);
});

// Trap Escape so the user can't dismiss an expired session into a broken state;
// the only way forward is to re-authenticate.
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal backdrop. Intentionally not dismissible by backdrop click: the
     session is gone, so re-authentication is the only path forward. -->
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

    <LoginForm initialEmail={email} onSuccess={clearSessionExpired} />
  </div>
</div>
