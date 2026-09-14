<script lang="ts">
import LockClosed from 'svelte-heros-v2/LockClosed.svelte';
import { goto } from '$app/navigation';
import AlertBanner from '$lib/components/alert-banner.svelte';
import LoginForm from '$lib/components/login-form.svelte';
import Button from '$lib/components/ui/button.svelte';
import Modal from '$lib/components/ui/modal.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { auth, currentUser } from '$lib/stores/auth';
import { abandonSessionExpired } from '$lib/stores/session';

const i18n = createI18n();

// Pre-fill the email of the user whose session expired so re-login is one tap
// (password / passkey) away.
const email = $derived($currentUser?.email ?? '');

let isLoggingOut = $state(false);

// Re-login succeeded: the auth store already dismissed the prompt and released
// any parked requests, so there's nothing left to do here.
function handleReauthenticated() {
  // Intentionally a no-op: unlike the standalone login page, we must NOT
  // navigate away — the point is to keep the user on their current page.
}

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

{#snippet footer()}
  <Button variant="ghost" size="sm" class="mx-auto" loading={isLoggingOut} onclick={handleLogout}>
    {$i18n.t('auth.sessionExpired.logout')}
  </Button>
{/snippet}

<!-- Deliberately not dismissible — neither Escape, the backdrop nor a close
     button: the session is gone, so re-authentication (or logout) is the only
     path forward. Top-layer dialogs stack by open order, not z-index: this one
     opens last by construction (the interceptor mounts it on a 401), so it
     covers whatever was already open. -->
<Modal title={$i18n.t('auth.sessionExpired.title')} size="md" closable={false} onClose={() => {}} {footer}>
  <div class="mb-6">
    <AlertBanner variant="warning">
      <div class="flex items-start gap-3">
        <LockClosed class="w-6 h-6 flex-shrink-0" strokeWidth="2" />
        <p>{$i18n.t('auth.sessionExpired.message')}</p>
      </div>
    </AlertBanner>
  </div>

  <LoginForm initialEmail={email} onSuccess={handleReauthenticated} />
</Modal>
