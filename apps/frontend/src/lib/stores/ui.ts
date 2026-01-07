import { writable } from 'svelte/store';

/**
 * Tracks if a modal or form overlay is open that should suppress keyboard shortcuts
 */
export const isModalOpen = writable(false);

/**
 * Tracks if "open mode" is active for quick keyboard navigation to list items
 * When active, list items show number indicators (1-9) and pressing a number opens that item
 */
export const isOpenModeActive = writable(false);

/**
 * List of contact IDs currently visible in the list (for open mode navigation)
 * Limited to first 9 items for keyboard access (keys 1-9)
 */
export const visibleContactIds = writable<string[]>([]);
