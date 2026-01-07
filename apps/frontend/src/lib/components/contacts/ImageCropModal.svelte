<script lang="ts">
import Cropper, { type CropArea, type OnCropCompleteEvent } from 'svelte-easy-crop';
import { isModalOpen } from '$lib/stores/ui';

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

// Mark modal as open for keyboard shortcut handling
$effect(() => {
  isModalOpen.set(true);
  return () => isModalOpen.set(false);
});

function handleCropComplete(event: OnCropCompleteEvent) {
  croppedAreaPixels = event.pixels;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !isProcessing) {
    onClose();
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget && !isProcessing) {
    onClose();
  }
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

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="crop-modal-title"
  tabindex="-1"
>
  <!-- Modal content -->
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
      <h2 id="crop-modal-title" class="text-xl font-heading text-gray-900">
        Crop Photo
      </h2>
      <button
        type="button"
        onclick={onClose}
        disabled={isProcessing}
        class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100
               disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Crop area -->
    <div class="relative w-full h-80 bg-gray-900">
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
    <div class="p-4 border-t border-gray-200">
      <label class="flex items-center gap-3">
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
    </div>

    <!-- Footer buttons -->
    <div class="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
      <button
        type="button"
        onclick={onClose}
        disabled={isProcessing}
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold
               text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleConfirm}
        disabled={isProcessing || !croppedAreaPixels}
        class="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold
               hover:bg-forest-light transition-colors disabled:opacity-50
               flex items-center justify-center gap-2"
      >
        {#if isProcessing}
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing...
        {:else}
          Use Photo
        {/if}
      </button>
    </div>
  </div>
</div>
