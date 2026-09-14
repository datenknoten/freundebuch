<script lang="ts">
import NotificationChannelList from '$lib/components/notification-channel-list.svelte';
import { PageShell } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
</script>

<svelte:head>
  <title>{$i18n.t('profile.messagingReminders.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="detail"
  title={$i18n.t('profile.messagingReminders.title')}
  subtitle={$i18n.t('profile.messagingReminders.description')}
  back={{ href: '/profile', label: $i18n.t('profile.hub.backToProfile') }}
>
  <NotificationChannelList />
</PageShell>
