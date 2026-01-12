import { writable } from 'svelte/store';

/**
 * Tracks if a modal or form overlay is open that should suppress keyboard shortcuts
 */
export const isModalOpen = writable(false);

/**
 * Tracks if "open mode" is active for quick keyboard navigation to list items
 * When active, list items show keyboard hints and key sequences can open items
 */
export const isOpenModeActive = writable(false);

/**
 * Tracks the current letter prefix in open mode (e.g., 'a', 'b', 'c')
 * null means we're waiting for either a number (1-9) or a letter (a-z)
 */
export const openModePrefix = writable<string | null>(null);

/**
 * List of friend IDs currently visible in the list (for open mode navigation)
 * Supports up to 234 items (26 letters × 9 numbers)
 */
export const visibleFriendIds = writable<string[]>([]);

/**
 * Maximum items per keyboard group (1-9)
 */
export const ITEMS_PER_GROUP = 9;

/**
 * Get the keyboard hint for an item at a given index
 * @param index 0-based index of the item
 * @returns The keyboard hint string (e.g., "1", "9", "a1", "b5")
 */
export function getKeyboardHint(index: number): string {
  if (index < ITEMS_PER_GROUP) {
    // First 9 items: just the number
    return String(index + 1);
  }

  // Calculate letter prefix and number
  const groupIndex = Math.floor(index / ITEMS_PER_GROUP) - 1; // 0 = 'a', 1 = 'b', etc.
  const numberInGroup = (index % ITEMS_PER_GROUP) + 1;
  const letter = String.fromCharCode(97 + groupIndex); // 97 = 'a'

  return `${letter}${numberInGroup}`;
}

/**
 * Get the friend index from a keyboard hint
 * @param hint The keyboard hint (e.g., "1", "a1", "b5")
 * @returns The 0-based index, or -1 if invalid
 */
export function getIndexFromHint(hint: string): number {
  if (hint.length === 1) {
    // Single digit: 1-9 maps to index 0-8
    const num = parseInt(hint, 10);
    if (num >= 1 && num <= 9) {
      return num - 1;
    }
    return -1;
  }

  if (hint.length === 2) {
    // Letter + digit: a1 maps to index 9, b1 maps to index 18, etc.
    const letter = hint[0].toLowerCase();
    const num = parseInt(hint[1], 10);

    if (letter >= 'a' && letter <= 'z' && num >= 1 && num <= 9) {
      const letterIndex = letter.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
      return (letterIndex + 1) * ITEMS_PER_GROUP + (num - 1);
    }
  }

  return -1;
}
