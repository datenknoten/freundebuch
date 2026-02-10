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

// =============================================================================
// Filter Mode State (keyboard-driven filter selection)
// =============================================================================

/**
 * Tracks if filter mode is active for keyboard filter selection
 * When active, user can press category keys then number keys to toggle filters
 */
export const isFilterModeActive = writable(false);

/**
 * The currently selected filter category in filter mode
 * null means waiting for category selection, string means selecting values
 */
export const filterModeCategory = writable<string | null>(null);

/**
 * Tracks the current letter prefix in filter mode (e.g., 'a', 'b', 'c')
 * null means we're waiting for either a number (1-9) or a letter (a-z)
 */
export const filterModePrefix = writable<string | null>(null);

// =============================================================================
// Circle Mode State (keyboard-driven circle editing/deletion)
// =============================================================================

/**
 * Tracks if "edit circle mode" is active for quick keyboard editing of circles
 * When active, list items show keyboard hints and key sequences can edit items
 */
export const isEditCircleModeActive = writable(false);

/**
 * Tracks the current letter prefix in edit circle mode (e.g., 'a', 'b', 'c')
 */
export const editCircleModePrefix = writable<string | null>(null);

/**
 * Tracks if "delete circle mode" is active for quick keyboard deletion of circles
 * When active, list items show keyboard hints and key sequences can delete items
 */
export const isDeleteCircleModeActive = writable(false);

/**
 * Tracks the current letter prefix in delete circle mode (e.g., 'a', 'b', 'c')
 */
export const deleteCircleModePrefix = writable<string | null>(null);

/**
 * List of circle IDs currently visible in the list (for keyboard navigation)
 */
export const visibleCircleIds = writable<string[]>([]);

// =============================================================================
// Collective Mode State (keyboard-driven collective opening)
// =============================================================================

/**
 * Tracks if "open collective mode" is active for quick keyboard navigation to collectives
 * When active, collective rows/cards show keyboard hints and key sequences can open items
 */
export const isOpenCollectiveModeActive = writable(false);

/**
 * Tracks the current letter prefix in open collective mode (e.g., 'a', 'b', 'c')
 */
export const openCollectiveModePrefix = writable<string | null>(null);

/**
 * List of collective IDs currently visible in the list (for open mode navigation)
 */
export const visibleCollectiveIds = writable<string[]>([]);

// =============================================================================
// Member Open Mode State (keyboard-driven member opening on collective detail)
// =============================================================================

/**
 * Tracks if "open member mode" is active for quick keyboard navigation to members
 * When active, member rows show keyboard hints and key sequences can open friend profiles
 */
export const isOpenMemberModeActive = writable(false);

/**
 * Tracks the current letter prefix in open member mode (e.g., 'a', 'b', 'c')
 */
export const openMemberModePrefix = writable<string | null>(null);

/**
 * List of friend/contact IDs of members currently visible (for open mode navigation)
 */
export const visibleMemberContactIds = writable<string[]>([]);

// =============================================================================
// Encounter Mode State (keyboard-driven encounter opening)
// =============================================================================

/**
 * Tracks if "open encounter mode" is active for quick keyboard navigation to encounters
 * When active, encounter cards show keyboard hints and key sequences can open items
 */
export const isOpenEncounterModeActive = writable(false);

/**
 * Tracks the current letter prefix in open encounter mode (e.g., 'a', 'b', 'c')
 */
export const openEncounterModePrefix = writable<string | null>(null);

/**
 * List of encounter IDs currently visible in the list (for keyboard navigation)
 */
export const visibleEncounterIds = writable<string[]>([]);

/**
 * Mapping of keyboard keys to filter category field names
 */
export const FILTER_CATEGORY_KEYS: Record<string, string> = {
  c: 'country',
  i: 'city',
  o: 'organization',
  j: 'job_title',
  d: 'department',
  r: 'relationship_category',
  l: 'circles',
};

/**
 * Reverse mapping: filter field names to keyboard keys (for display)
 */
export const FILTER_CATEGORY_LABELS: Record<string, { key: string; label: string }> = {
  country: { key: 'c', label: 'Country' },
  city: { key: 'i', label: 'City' },
  organization: { key: 'o', label: 'Organization' },
  job_title: { key: 'j', label: 'Job Title' },
  department: { key: 'd', label: 'Department' },
  relationship_category: { key: 'r', label: 'Relationship' },
  circles: { key: 'l', label: 'Circles' },
};
