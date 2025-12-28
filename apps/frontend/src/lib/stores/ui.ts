import { writable } from 'svelte/store';

/**
 * Tracks if a modal or form overlay is open that should suppress keyboard shortcuts
 */
export const isModalOpen = writable(false);
