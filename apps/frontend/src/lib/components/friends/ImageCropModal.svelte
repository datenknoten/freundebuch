<script lang="ts">
import Cropper, { type CropArea, type OnCropCompleteEvent } from 'svelte-easy-crop';
import { getAppContext } from '$lib/app-context.js';
import Button from '$lib/components/ui/Button.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();
const logger = getAppContext().logger;

interface Props {
  imageUrl: string;
  onCrop: (croppedBlob: Blob) => void;
  onClose: () => void;
}

let { imageUrl, onCrop, onClose }: Props = $props();

let crop = $state({ x: 0, y: 0 });
let zoom = $state(1);
let croppedAreaPixels = $state<CropArea | null>(null);
let isProcessing = $state(false);

function handleCropComplete(event: OnCropCompleteEvent) {
  croppedAreaPixels = event.pixels;
}

function createImage(url: string) {
  function loadImage(
    resolve: (image: HTMLImageElement) => void,
    reject: (reason: unknown) => void,
  ) {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  }
  return new Promise(loadImage);
}

async function getCroppedImg(imageSrc: string, pixelCrop: CropArea) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (ctx === null) {
    throw new InvariantError('The canvas has no 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  function exportBlob(resolve: (blob: Blob) => void, reject: (reason: unknown) => void) {
    function settle(blob: Blob | null) {
      if (blob !== null) {
        resolve(blob);
      } else {
        reject(new InvariantError('Canvas is empty'));
      }
    }
    canvas.toBlob(settle, 'image/jpeg', 0.9);
  }
  return new Promise(exportBlob);
}

async function handleConfirm() {
  if (croppedAreaPixels === null) {
    return;
  }

  isProcessing = true;
  try {
    const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels);
    onCrop(croppedBlob);
  } catch (error) {
    logger.error({ err: error }, 'Failed to crop image');
  } finally {
    isProcessing = false;
  }
}
</script>

{#snippet footer()}
  <Button variant="secondary" class="flex-1" disabled={isProcessing} onclick={onClose}>
    {$i18n.t('common.cancel')}
  </Button>
  <Button
    class="flex-1"
    loading={isProcessing}
    disabled={croppedAreaPixels === null}
    onclick={handleConfirm}
  >
    {$i18n.t('imageCrop.usePhoto')}
  </Button>
{/snippet}

<Modal title={$i18n.t('imageCrop.title')} size="lg" closable={!isProcessing} {onClose} {footer}>
  <!-- Crop area -->
  <div class="relative w-full h-80 bg-gray-900 rounded-lg overflow-hidden">
    <Cropper
      image={imageUrl}
      bind:crop
      bind:zoom
      aspect={1}
      cropShape="round"
      showGrid={false}
      oncropcomplete={handleCropComplete}
    />
  </div>

  <!-- Zoom slider -->
  <label class="mt-4 flex items-center gap-3">
    <span class="text-sm font-body text-gray-600">{$i18n.t('imageCrop.zoom')}</span>
    <input
      type="range"
      min="1"
      max="3"
      step="0.1"
      bind:value={zoom}
      class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-forest"
    />
  </label>
</Modal>
