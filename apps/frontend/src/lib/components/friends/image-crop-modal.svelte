<script lang="ts">
import Cropper, { type CropArea, type OnCropCompleteEvent } from 'svelte-easy-crop';
import Button from '$lib/components/ui/button.svelte';
import Modal from '$lib/components/ui/modal.svelte';

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

/**
 * Creates an HTMLImageElement from a URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/**
 * Crops the image using canvas and returns a Blob
 */
async function getCroppedImg(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to the cropped area size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
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

  // Return as blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      'image/jpeg',
      0.9,
    );
  });
}

async function handleConfirm() {
  if (!croppedAreaPixels) return;

  isProcessing = true;
  try {
    const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels);
    onCrop(croppedBlob);
  } catch (error) {
    console.error('Error cropping image:', error);
  } finally {
    isProcessing = false;
  }
}
</script>

{#snippet footer()}
  <Button variant="secondary" class="flex-1" disabled={isProcessing} onclick={onClose}>
    Cancel
  </Button>
  <Button
    class="flex-1"
    loading={isProcessing}
    disabled={croppedAreaPixels === null}
    onclick={handleConfirm}
  >
    Use Photo
  </Button>
{/snippet}

<Modal title="Crop Photo" size="lg" closable={!isProcessing} {onClose} {footer}>
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
    <span class="text-sm font-body text-gray-600">Zoom</span>
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
