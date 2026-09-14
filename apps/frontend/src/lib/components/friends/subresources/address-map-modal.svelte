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
</script>

<!-- Rendered only while open (the caller guards it), so Leaflet initialises on
     mount and is torn down again as soon as the map is dismissed. -->
<Modal
  title={addressLabel.length > 0 ? addressLabel : $i18n.t('subresources.address.address')}
  size="xl"
  fullscreen
  {onClose}
>
  <AddressMap {latitude} {longitude} {addressLabel} heightClass="h-full" />
</Modal>
