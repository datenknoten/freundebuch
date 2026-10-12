<script lang="ts">
import Modal from '$lib/components/ui/modal.svelte';
import { createI18n } from '$lib/i18n/index.js';
import AddressMap from './address-map.svelte';

const i18n = createI18n();

interface Props {
  latitude: number;
  longitude: number;
  addressLabel: string;
  onClose: () => void;
}

let { latitude, longitude, addressLabel, onClose }: Props = $props();

// Leaflet runs pinch-zoom itself, but its `touch-action: none` covers only the
// tile area. A pinch that starts on the header, the padding or the backdrop
// zooms the page instead and can push the close button off-screen, with the
// map swallowing the pan that would bring it back. `touch-none` on the dialog
// covers the rest; iOS Safari also drives page zoom through its proprietary
// `gesture*` events, which Leaflet doesn't use, so cancel them while open.
$effect(() => {
  const preventPageZoom = (event: Event) => event.preventDefault();
  document.addEventListener('gesturestart', preventPageZoom);
  document.addEventListener('gesturechange', preventPageZoom);
  return () => {
    document.removeEventListener('gesturestart', preventPageZoom);
    document.removeEventListener('gesturechange', preventPageZoom);
  };
});
</script>

<!-- Rendered only while open (the caller guards it), so Leaflet initialises on
     mount and is torn down again as soon as the map is dismissed. -->
<Modal
  title={addressLabel.length > 0 ? addressLabel : $i18n.t('subresources.address.address')}
  size="xl"
  fullscreen
  class="touch-none"
  {onClose}
>
  <AddressMap {latitude} {longitude} {addressLabel} heightClass="h-full" />
</Modal>
