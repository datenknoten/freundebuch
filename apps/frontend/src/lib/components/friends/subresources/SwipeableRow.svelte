<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  children: Snippet;
}

let { onSwipeLeft, onSwipeRight, disabled = false, children }: Props = $props();

// Swipe thresholds from spec
const MIN_SWIPE = 50; // Minimum distance to reveal action
const FULL_SWIPE = 150; // Distance for auto-trigger
const RESISTANCE = 0.8; // Movement dampening

// Touch state
let startX = $state(0);
let startY = $state(0);
let currentX = $state(0);
let swipeOffset = $state(0);
let isSwiping = $state(false);
let isHorizontalSwipe = $state<boolean | null>(null);
let hapticTriggered = $state(false);

function handleTouchStart(e: TouchEvent) {
  if (disabled) return;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  currentX = startX;
  isSwiping = true;
  isHorizontalSwipe = null;
  hapticTriggered = false;
}

function handleTouchMove(e: TouchEvent) {
  if (!isSwiping || disabled) return;

  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;
  const deltaX = touchX - startX;
  const deltaY = touchY - startY;

  // Determine if this is a horizontal or vertical swipe
  if (isHorizontalSwipe === null) {
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    }
  }

  // Only handle horizontal swipes
  if (!isHorizontalSwipe) {
    return;
  }

  // Prevent vertical scrolling during horizontal swipe
  e.preventDefault();

  currentX = touchX;
  // Apply resistance (0.8x movement)
  swipeOffset = deltaX * RESISTANCE;

  // Trigger haptic feedback at threshold crossing
  if (Math.abs(swipeOffset) >= MIN_SWIPE && !hapticTriggered) {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    hapticTriggered = true;
  }
}

function handleTouchEnd() {
  if (!isSwiping || disabled) return;
  isSwiping = false;

  const finalOffset = swipeOffset;

  if (finalOffset < -FULL_SWIPE && onSwipeLeft) {
    // Full swipe left - trigger delete
    onSwipeLeft();
  } else if (finalOffset > FULL_SWIPE && onSwipeRight) {
    // Full swipe right - trigger edit
    onSwipeRight();
  }

  // Snap back to center
  swipeOffset = 0;
  isHorizontalSwipe = null;
}

function handleTouchCancel() {
  isSwiping = false;
  swipeOffset = 0;
  isHorizontalSwipe = null;
}

// Calculate action visibility based on swipe offset
let showDeleteAction = $derived(swipeOffset < -MIN_SWIPE);
let showEditAction = $derived(swipeOffset > MIN_SWIPE);
let deleteScale = $derived(Math.min(1, Math.abs(swipeOffset) / FULL_SWIPE));
let editScale = $derived(Math.min(1, swipeOffset / FULL_SWIPE));
</script>

<div class="relative overflow-hidden touch-pan-y">
  <!-- Delete action (revealed on swipe left) -->
  <div
    class="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center
           transition-opacity duration-150"
    class:opacity-100={showDeleteAction}
    class:opacity-0={!showDeleteAction}
    style="transform: scale({0.8 + deleteScale * 0.2})"
  >
    <div class="text-white flex flex-col items-center gap-1">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      <span class="text-xs font-semibold">Delete</span>
    </div>
  </div>

  <!-- Edit action (revealed on swipe right) -->
  <div
    class="absolute inset-y-0 left-0 w-24 bg-forest flex items-center justify-center
           transition-opacity duration-150"
    class:opacity-100={showEditAction}
    class:opacity-0={!showEditAction}
    style="transform: scale({0.8 + editScale * 0.2})"
  >
    <div class="text-white flex flex-col items-center gap-1">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
      <span class="text-xs font-semibold">Edit</span>
    </div>
  </div>

  <!-- Main content (slides with swipe) -->
  <div
    class="relative bg-white"
    style="transform: translateX({swipeOffset}px); transition: {isSwiping
      ? 'none'
      : 'transform 200ms ease-out'}"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    ontouchcancel={handleTouchCancel}
    role="row"
  >
    {@render children()}
  </div>
</div>
