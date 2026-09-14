<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import LegalLinks from './legal-links.svelte';

const i18n = createI18n();
</script>

<footer class="hidden sm:block border-t border-gray-200 bg-white py-4">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-center gap-3 text-sm font-body text-gray-500">
      <span>{$i18n.t('footer.copyright')}</span>
      <span class="text-gray-300" aria-hidden="true">·</span>
      <LegalLinks />
    </div>
  </div>
</footer>
