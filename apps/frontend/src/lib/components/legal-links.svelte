<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';

interface Props {
  /** `sm` is the drawer footer, `md` the page footer. */
  size?: 'sm' | 'md';
  /** Called when a link is followed (the drawer closes itself). */
  onnavigate?: () => void;
}

const i18n = createI18n();
const version = __APP_VERSION__;

let { size = 'md', onnavigate }: Props = $props();

const text = $derived(size === 'sm' ? 'text-xs' : 'text-sm');
</script>

<div class="flex items-center justify-center gap-3 {text} font-body text-gray-500">
  <a
    href="https://github.com/datenknoten/freundebuch"
    class="hover:text-forest transition-colors"
    target="_blank"
    rel="noopener noreferrer"
  >
    v{version}
  </a>
  <span class="text-gray-300" aria-hidden="true">·</span>
  <a href="/privacy" onclick={onnavigate} class="hover:text-forest transition-colors">
    {$i18n.t('footer.privacy')}
  </a>
  <span class="text-gray-300" aria-hidden="true">·</span>
  <a href="/terms" onclick={onnavigate} class="hover:text-forest transition-colors">
    {$i18n.t('footer.terms')}
  </a>
</div>
