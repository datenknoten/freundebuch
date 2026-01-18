<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();
const version = __APP_VERSION__;
</script>

<footer class="hidden sm:block border-t border-gray-200 bg-white py-4">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-center gap-4 text-sm font-body">
      <span class="text-gray-500">{$i18n.t('footer.copyright')} v{version}</span>
      <span class="text-gray-300">|</span>
      <a href="/privacy" class="text-gray-500 hover:text-forest transition-colors duration-200">{$i18n.t('footer.privacy')}</a>
      <span class="text-gray-300">|</span>
      <a href="/terms" class="text-gray-500 hover:text-forest transition-colors duration-200">{$i18n.t('footer.terms')}</a>
    </div>
  </div>
</footer>
