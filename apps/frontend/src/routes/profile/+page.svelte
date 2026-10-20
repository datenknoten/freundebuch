<script lang="ts">
import { onMount } from 'svelte';
import ChatBubbleLeft from 'svelte-heros-v2/ChatBubbleLeft.svelte';
import CloudArrowUp from 'svelte-heros-v2/CloudArrowUp.svelte';
import CommandLine from 'svelte-heros-v2/CommandLine.svelte';
import FingerPrint from 'svelte-heros-v2/FingerPrint.svelte';
import LockClosed from 'svelte-heros-v2/LockClosed.svelte';
import PaintBrush from 'svelte-heros-v2/PaintBrush.svelte';
import User from 'svelte-heros-v2/User.svelte';
import { getAppContext } from '$lib/app-context.js';
import ProfileCard from '$lib/components/ProfileCard.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n, LANGUAGE_NAMES } from '$lib/i18n/i18n.js';

const { api, authClient, logger, stores } = getAppContext();
const birthdayFormat = stores.auth.birthdayFormat;
const currentUser = stores.auth.currentUser;
const currentLanguage = stores.locale.currentLanguage;
const notificationChannels = stores.notificationChannels;

const i18n = createI18n();

const pageTitle = $derived(
  $currentUser?.email !== undefined && $currentUser.email !== ''
    ? `${$currentUser.email} | Freundebuch`
    : 'Profile | Freundebuch',
);

let passkeyCount = $state(0);
let appPasswordCount = $state(0);

async function loadProfileCounts() {
  try {
    const [passkeyResult, appPasswords] = await Promise.all([
      authClient.passkey.listUserPasskeys(),
      api.appPasswords.listAppPasswords(),
      notificationChannels.loadChannels(),
    ]);
    passkeyCount = (passkeyResult?.data ?? []).length;
    appPasswordCount = appPasswords.length;
  } catch (err) {
    // Counts stay at 0: the cards show their "No X" status.
    logger.warn({ err }, 'Failed to load the profile counts');
  }
}
onMount(loadProfileCounts);

const accountStatus = $derived($currentUser?.email ?? '');

const displayStatus = $derived(
  $i18n.t('profile.hub.status.language', {
    language: LANGUAGE_NAMES[$currentLanguage] ?? $currentLanguage,
    format: $birthdayFormat.toUpperCase(),
  }),
);

const passkeyStatus = $derived(
  passkeyCount > 0
    ? $i18n.t('profile.hub.status.passkeyCount', { count: passkeyCount })
    : $i18n.t('profile.hub.status.noPasskeys'),
);

const appPasswordStatus = $derived(
  appPasswordCount > 0
    ? $i18n.t('profile.hub.status.appPasswordCount', { count: appPasswordCount })
    : $i18n.t('profile.hub.status.noAppPasswords'),
);

const channelTotal = $derived($notificationChannels.channels.length);
const channelEnabled = $derived($notificationChannels.channels.filter((c) => c.isEnabled).length);
const messagingStatus = $derived(
  channelTotal > 0
    ? `${$i18n.t('profile.hub.status.channelCount', { count: channelTotal })} · ${$i18n.t('profile.hub.status.channelsEnabled', { count: channelEnabled })}`
    : $i18n.t('profile.hub.status.noChannels'),
);

const carddavStatus = $derived(
  appPasswordCount > 0
    ? $i18n.t('profile.hub.status.carddavReady')
    : $i18n.t('profile.hub.status.carddavNeedsPassword'),
);

const mcpStatus = $derived(
  appPasswordCount > 0
    ? $i18n.t('profile.hub.status.mcpReady')
    : $i18n.t('profile.hub.status.mcpNeedsPassword'),
);
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<PageShell
  width="list"
  title={$i18n.t('profile.yourProfile')}
  subtitle={$i18n.t('profile.subtitle')}
>
  <section class="mb-10">
    <h2 class="text-lg font-heading text-gray-800 mb-4">{$i18n.t('profile.hub.categories.account')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProfileCard
        href="/profile/account"
        title={$i18n.t('profile.hub.cards.account.title')}
        description={$i18n.t('profile.hub.cards.account.description')}
        status={accountStatus}
      >
        {#snippet icon()}<User class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>

      <ProfileCard
        href="/profile/display"
        title={$i18n.t('profile.hub.cards.display.title')}
        description={$i18n.t('profile.hub.cards.display.description')}
        status={displayStatus}
      >
        {#snippet icon()}<PaintBrush class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>
    </div>
  </section>

  <section class="mb-10">
    <h2 class="text-lg font-heading text-gray-800 mb-4">{$i18n.t('profile.hub.categories.security')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProfileCard
        href="/profile/passkeys"
        title={$i18n.t('profile.hub.cards.passkeys.title')}
        description={$i18n.t('profile.hub.cards.passkeys.description')}
        status={passkeyStatus}
      >
        {#snippet icon()}<FingerPrint class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>

      <ProfileCard
        href="/profile/app-passwords"
        title={$i18n.t('profile.hub.cards.appPasswords.title')}
        description={$i18n.t('profile.hub.cards.appPasswords.description')}
        status={appPasswordStatus}
      >
        {#snippet icon()}<LockClosed class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>
    </div>
  </section>

  <section>
    <h2 class="text-lg font-heading text-gray-800 mb-4">{$i18n.t('profile.hub.categories.integrations')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProfileCard
        href="/profile/messaging"
        title={$i18n.t('profile.hub.cards.messaging.title')}
        description={$i18n.t('profile.hub.cards.messaging.description')}
        status={messagingStatus}
      >
        {#snippet icon()}<ChatBubbleLeft class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>

      <ProfileCard
        href="/profile/carddav"
        title={$i18n.t('profile.hub.cards.carddav.title')}
        description={$i18n.t('profile.hub.cards.carddav.description')}
        status={carddavStatus}
      >
        {#snippet icon()}<CloudArrowUp class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>

      <ProfileCard
        href="/profile/mcp"
        title={$i18n.t('profile.hub.cards.mcp.title')}
        description={$i18n.t('profile.hub.cards.mcp.description')}
        status={mcpStatus}
      >
        {#snippet icon()}<CommandLine class="w-5 h-5" strokeWidth="2" />{/snippet}
      </ProfileCard>
    </div>
  </section>
</PageShell>
