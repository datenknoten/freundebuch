<script lang="ts">
import type L from 'leaflet';
import { onDestroy, onMount } from 'svelte';

interface Props {
  latitude: number;
  longitude: number;
  addressLabel?: string;
  /** Tailwind height utility (e.g. "h-48", "h-96"). Defaults to a compact 12rem. */
  heightClass?: string;
}

let { latitude, longitude, addressLabel = '', heightClass = 'h-48' }: Props = $props();

// Resolved once at module load — these are static asset URLs and don't depend
// on the live latitude/longitude props.
const markerIconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const markerIcon2xUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const markerShadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;

let mapContainer: HTMLDivElement;
let map: L.Map | null = null;
let marker: L.Marker | null = null;

onMount(async () => {
  // Dynamically import Leaflet and its CSS to keep the initial bundle small.
  const [leafletModule] = await Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ]);

  const defaultIcon = leafletModule.icon({
    iconUrl: markerIconUrl,
    iconRetinaUrl: markerIcon2xUrl,
    shadowUrl: markerShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  map = leafletModule.map(mapContainer).setView([latitude, longitude], 16);

  leafletModule
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    })
    .addTo(map);

  marker = leafletModule.marker([latitude, longitude], { icon: defaultIcon }).addTo(map);

  if (addressLabel) {
    marker.bindPopup(addressLabel);
  }
});

// Reactively update the view when coordinates or label change after mount.
$effect(() => {
  if (!map || !marker) return;
  map.setView([latitude, longitude]);
  marker.setLatLng([latitude, longitude]);
  if (addressLabel) {
    marker.bindPopup(addressLabel);
  } else {
    marker.unbindPopup();
  }
});

onDestroy(() => {
  if (map) {
    map.remove();
    map = null;
    marker = null;
  }
});
</script>

<div bind:this={mapContainer} class="w-full {heightClass} rounded-lg overflow-hidden border border-gray-200"></div>
