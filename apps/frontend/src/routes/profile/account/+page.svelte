<script lang="ts">
import { FormInput, PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { currentUser } from '$lib/stores/auth';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.hub.cards.account.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="detail"
  title={$i18n.t('profile.hub.cards.account.title')}
  subtitle={$i18n.t('profile.hub.cards.account.description')}
  back={{ href: '/profile', label: $i18n.t('profile.hub.backToProfile') }}
>
  <div class="space-y-6">
    <FormInput
      id="user-id"
      label={$i18n.t('profile.userId')}
      value={$currentUser?.externalId ?? ''}
      helper={$i18n.t('profile.userIdHelp')}
      disabled
    />

    <FormInput
      id="email"
      type="email"
      label={$i18n.t('profile.emailAddress')}
      value={$currentUser?.email ?? ''}
      disabled
    />
  </div>
</PageShell>
