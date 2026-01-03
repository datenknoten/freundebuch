# Epic 14: Edit Details Right on the Page

**Status:** Planned
**Phase:** Enhancement
**Priority:** High

## Overview

Right now, if you want to add a friend's phone number or fix a typo in their email, you have to leave their page, open an edit form, scroll around, make your change, save, and come back. That's a lot of steps just to jot down a phone number.

This epic makes it simple: add and edit details (phones, emails, addresses, dates, social profiles) directly on your friend's page. See something that needs updating? Click the pencil, fix it, done. Want to add their new work email? Hit the "+" button right there. Your Freundebuch should feel as easy to update as jotting a note in the margins of a real friendship book.

## Problem Statement

Updating a friend's details currently feels like too much work:

1. You're looking at Sarah's page and realize her phone number is wrong
2. You click "Edit" and land in a big form
3. You scroll down to find the phone section
4. You make the change, hit save
5. You're back on her page—finally

For something as quick as "oh, she has a new number," that's way too many steps. It breaks the flow of just... remembering things about your friends.

## Proposed Solution

### Desktop Experience

Edit details right where you see them on a friend's page:

1. **Add Button with Dropdown**: A single "+" button in each section opens a menu to add:
   - Phone Number
   - Email Address
   - Address
   - Website/URL
   - Important Date
   - Social Profile

2. **Edit Action (Pencil Icon)**: Hover over any detail to reveal a pencil icon—click to edit in a quick modal.

3. **Delete Action (Red X Icon)**: Same hover reveals a red X to remove outdated info (with confirmation, of course).

### Mobile Experience Considerations

The desktop pattern of hover-revealed icons doesn't work on touch devices. Here are the proposed approaches for mobile:

#### Option A: Always-Visible Compact Icons
- Show edit (pencil) and delete (X) icons permanently, but styled subtly
- Icons are smaller and use muted colors until tapped
- Pros: Discoverable, no hidden gestures to learn
- Cons: More visual clutter

#### Option B: Tap to Reveal Actions
- Single tap on a subresource item reveals action buttons
- Second tap outside closes the action panel
- Pros: Clean initial appearance
- Cons: Requires two taps, less intuitive

#### Option C: Swipe Actions
- Swipe left on an item to reveal delete (red background)
- Swipe right on an item to reveal edit (green background)
- Pros: Familiar pattern from iOS Mail, many native apps
- Cons: Not discoverable, requires gesture knowledge

#### Option D: Long-Press Context Menu
- Long-press on an item opens a context menu with Edit/Delete options
- Pros: Clean UI, familiar mobile pattern
- Cons: Not discoverable, accessibility concerns

#### Option E: Bottom Sheet Actions
- Tap on an item opens a bottom sheet with "Edit" and "Delete" buttons
- Pros: Large touch targets, accessible
- Cons: Extra step, interrupts flow

### Recommended Approach: Combined A + C

**Use both Option A and Option C together** to provide the best mobile experience:

1. **Always-visible icons (Option A)** ensure accessibility and discoverability for all users, including those unfamiliar with swipe gestures
2. **Swipe actions (Option C)** provide a fast, native-feeling experience for power users familiar with iOS/Android patterns

This dual approach means:
- New users can immediately see and tap the edit/delete icons
- Experienced mobile users can swipe for faster interactions
- Accessibility requirements are met (no gesture-only actions)
- The UI feels native and polished on mobile devices

## User Stories

1. While looking at a friend's page, I want to add their phone number without navigating away
2. I notice a typo in someone's email—I want to fix it right there with a quick click
3. A friend deleted their old Twitter account—I want to remove that outdated link easily
4. On my phone, I want clear buttons to add or edit details without hunting for them
5. On my phone, I want to swipe to quickly edit or remove something (like I do in other apps)
6. On desktop, I want keyboard shortcuts to add details without reaching for the mouse
7. When I make a change, I want to see it immediately—no page refresh needed

## Design Specifications

### Desktop UI

```
┌─────────────────────────────────────────────────────────────┐
│  Phone Numbers                                    [+ Add ▼] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  +1 555-123-4567          Mobile           [✏️] [✖️] │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  +1 555-987-6543          Work - Direct    [✏️] [✖️] │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Dropdown menu when clicking [+ Add ▼]:
┌──────────────────┐
│ Phone Number     │
│ Email Address    │
│ Address          │
│ Website/URL      │
│ Important Date   │
│ Social Profile   │
└──────────────────┘
```

### Mobile UI (Combined A + C)

**Default State** - Always-visible icons (muted):
```
┌─────────────────────────────────────┐
│  Phone Numbers              [+ Add] │
├─────────────────────────────────────┤
│  +1 555-123-4567                    │
│  Mobile                    [✏️] [✖️] │
├─────────────────────────────────────┤
│  +1 555-987-6543                    │
│  Work - Direct             [✏️] [✖️] │
└─────────────────────────────────────┘
```

**Swipe Left** - Reveals delete action:
```
┌─────────────────────────────────────┐
│  +1 555-123-4567           ┌───────┐│
│  Mobile              ←←←←  │Delete ││
│                            └───────┘│
└─────────────────────────────────────┘
        (red background on action)
```

**Swipe Right** - Reveals edit action:
```
┌─────────────────────────────────────┐
│┌──────┐          +1 555-123-4567    │
││ Edit │  →→→→    Mobile             │
│└──────┘                             │
└─────────────────────────────────────┘
      (green/forest background on action)
```

### Icon Styling

**Desktop (hover state)**:
- Icons hidden by default, appear on row hover
- Pencil: `text-gray-400 hover:text-forest`
- X (delete): `text-gray-400 hover:text-red-600`

**Mobile (always visible)**:
- Icons always shown, smaller size (`w-4 h-4`)
- Pencil: `text-gray-300` (muted until tapped)
- X (delete): `text-gray-300` (muted until tapped)
- Active state brightens to full color

### Swipe Action Styling

**Swipe thresholds**:
- Minimum swipe distance: 50px to trigger action reveal
- Full swipe (>150px): Auto-triggers action without additional tap
- Snap-back animation: 200ms ease-out when swipe doesn't meet threshold

**Swipe left (Delete)**:
- Background: `bg-red-500`
- Text/Icon: White trash icon + "Delete" label
- Full swipe triggers delete confirmation modal

**Swipe right (Edit)**:
- Background: `bg-forest`
- Text/Icon: White pencil icon + "Edit" label
- Full swipe opens edit modal immediately

**Visual feedback during swipe**:
- Row content follows finger with slight resistance (0.8x movement)
- Action button scales up slightly as threshold approaches
- Haptic feedback (if available) at threshold crossing

### Edit Modal

Use a **centered modal window** for both adding and editing subresources. This provides:
- Clear focus on the editing task
- Consistent experience across add/edit operations
- Works well on both desktop and mobile
- Easy to dismiss (Escape key, click outside, or Cancel button)

**Modal Structure:**
```
┌─────────────────────────────────────────────┐
│  Edit Phone Number                      [✕] │
├─────────────────────────────────────────────┤
│                                             │
│  Phone Number                               │
│  ┌─────────────────────────────────────┐   │
│  │ +1 555-123-4567                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Type                                       │
│  ┌─────────────────────────────────────┐   │
│  │ Mobile                            ▼ │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Label (optional)                           │
│  ┌─────────────────────────────────────┐   │
│  │ Personal cell                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ☐ Primary phone number                     │
│                                             │
├─────────────────────────────────────────────┤
│                      [Cancel]    [Save]     │
└─────────────────────────────────────────────┘
```

**Modal Behavior:**
- Opens centered with backdrop overlay (`bg-black bg-opacity-50`)
- Max width: `max-w-md` (448px)
- Responsive: Full-width on mobile with slight margin (`mx-4`)
- Focus trapped inside modal while open
- First input auto-focused on open
- Escape key closes modal (with unsaved changes warning if dirty)
- Click outside closes modal (with unsaved changes warning if dirty)

**Modal States:**
- **Default**: Form fields editable, Save button enabled
- **Loading**: Form disabled, Save button shows spinner + "Saving..."
- **Error**: Error message displayed above buttons, form re-enabled
- **Success**: Modal closes, parent view refreshes with updated data

### Delete Confirmation Modal

Use a **confirmation modal** for delete actions:

```
┌─────────────────────────────────────────────┐
│  Delete Phone Number                        │
├─────────────────────────────────────────────┤
│                                             │
│  Are you sure you want to delete this       │
│  phone number?                              │
│                                             │
│  +1 555-123-4567 (Mobile)                   │
│                                             │
│  This action cannot be undone.              │
│                                             │
├─────────────────────────────────────────────┤
│                      [Cancel]    [Delete]   │
└─────────────────────────────────────────────┘
```

- Delete button styled with `bg-red-600 hover:bg-red-700`
- Shows the item being deleted for confirmation
- Loading state on Delete button during API call

### Keyboard Shortcuts (Desktop)

Integrate with existing `KeyboardShortcuts.svelte` component using the established two-key sequence pattern. Use `a` (add) as the prefix key, similar to `g` (go) for navigation.

**Add Details Shortcuts** (when viewing a friend's page):

| Shortcut | Action |
|----------|--------|
| `a` then `p` | Add **P**hone number |
| `a` then `e` | Add **E**mail address |
| `a` then `a` | Add **A**ddress |
| `a` then `u` | Add **U**RL/website |
| `a` then `d` | Add **D**ate |
| `a` then `s` | Add **S**ocial profile |

**Implementation:**
- Dispatch custom events: `shortcut:add-phone`, `shortcut:add-email`, etc.
- The friend's page component listens for these events and opens the appropriate add modal
- Shortcuts only active when viewing a friend's page (not on the friends list or edit form)
- Pending key indicator shows `a ...` at bottom-left (consistent with existing `g ...`)

**Help Dialog Update:**
Add a new "Add Details" section to the keyboard shortcuts help dialog (`?`):

```
Add Details (on a friend's page)
────────────────────────────────
Add Phone         a then p
Add Email         a then e
Add Address       a then a
Add URL           a then u
Add Date          a then d
Add Social        a then s
```

## Technical Implementation

### Component Changes

| Component | Change |
|-----------|--------|
| `ContactDetail.svelte` | Add edit/delete buttons to friend's page, listen for keyboard shortcut events |
| `DetailActions.svelte` | New component for edit/delete icon buttons |
| `SwipeableRow.svelte` | New component for swipe-to-reveal actions (mobile) |
| `AddDetailDropdown.svelte` | New dropdown component for adding details |
| `DetailEditModal.svelte` | New modal for adding/editing details |
| `DeleteConfirmModal.svelte` | New modal for delete confirmation |
| `PhoneEditForm.svelte` | Form fields for phone editing (used inside modal) |
| `EmailEditForm.svelte` | Form fields for email editing (used inside modal) |
| `AddressEditForm.svelte` | Form fields for address editing (used inside modal) |
| `UrlEditForm.svelte` | Form fields for URL editing (used inside modal) |
| `DateEditForm.svelte` | Form fields for date editing (used inside modal) |
| `SocialProfileEditForm.svelte` | Form fields for social profile editing (used inside modal) |
| `KeyboardShortcuts.svelte` | Add `a+` prefix sequence for adding details |
| `ContactForm.svelte` | Remove detail sections (simplify to core friend info only) |

### API Endpoints

Existing endpoints are sufficient - no backend changes required:

| Method | Endpoint | Usage |
|--------|----------|-------|
| POST | `/api/contacts/:id/phones` | Add phone |
| PUT | `/api/contacts/:id/phones/:phoneId` | Edit phone |
| DELETE | `/api/contacts/:id/phones/:phoneId` | Delete phone |
| (similar for emails, addresses, urls, dates, social-profiles) |

### State Management

- Use optimistic updates for better UX
- Show loading states during API calls
- Revert on error with error message display
- Invalidate contact cache after successful mutation

## Migration Strategy

### Phase 1: Add inline editing to friend's page
- Implement edit/delete icon buttons on the friend's page (desktop + mobile)
- Implement SwipeableRow component for mobile swipe gestures
- Keep existing edit form functionality during transition

### Phase 2: Simplify the edit form
- Remove detail sections from the edit form
- Edit form focuses only on: name, photo, professional info, how you met, interests

### Phase 3: Polish and enhancements
- Add haptic feedback on swipe threshold crossing (mobile)
- Fine-tune swipe animation timing and resistance
- Add swipe hint animation for first-time users (optional onboarding)

## Accessibility Considerations

- All action buttons must have proper `aria-label` attributes
- Focus management when opening/closing modals
- Keyboard navigation for dropdown menu
- Screen reader announcements for add/edit/delete actions
- Touch targets minimum 44x44px on mobile

## Success Metrics

- Subresource add/edit/delete actions complete in <200ms
- Modal opens in <100ms
- Zero regression in existing contact CRUD functionality
- Mobile touch targets meet WCAG 2.1 AA guidelines

## Out of Scope

- Drag-and-drop reordering of details
- Bulk editing of multiple details at once
- Undo/redo functionality

## Dependencies

- Epic 1A: Core friend pages (must be complete)
- Epic 1B: Extended friend details (must be complete)

## Related Epics

- Epic 1: Friends & Pages - provides the data model for friend details
- Epic 6: CalDAV/CardDAV - syncs changes with external apps

## Frontend Components Detail

### SwipeableRow.svelte

```svelte
<script lang="ts">
  import { spring } from 'svelte/motion';

  interface Props {
    onEdit: () => void;
    onDelete: () => void;
    children: import('svelte').Snippet;
  }

  let { onEdit, onDelete, children }: Props = $props();

  const SWIPE_THRESHOLD = 50;   // Min distance to reveal action
  const ACTION_THRESHOLD = 150; // Distance for auto-trigger

  let startX = $state(0);
  let currentX = $state(0);
  let isSwiping = $state(false);

  // Spring animation for smooth snap-back
  const offset = spring(0, { stiffness: 0.2, damping: 0.8 });

  function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    isSwiping = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    // Apply resistance (0.8x movement)
    offset.set(diff * 0.8, { hard: true });
  }

  function handleTouchEnd() {
    isSwiping = false;
    const diff = currentX - startX;

    if (diff < -ACTION_THRESHOLD) {
      // Full swipe left - trigger delete
      onDelete();
    } else if (diff > ACTION_THRESHOLD) {
      // Full swipe right - trigger edit
      onEdit();
    }

    // Snap back to center
    offset.set(0);
  }
</script>

<div class="relative overflow-hidden touch-pan-y">
  <!-- Delete action (revealed on swipe left) -->
  <div class="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center">
    <button onclick={onDelete} class="text-white font-semibold" aria-label="Delete">
      <!-- Trash icon + "Delete" -->
      Delete
    </button>
  </div>

  <!-- Edit action (revealed on swipe right) -->
  <div class="absolute inset-y-0 left-0 w-24 bg-forest flex items-center justify-center">
    <button onclick={onEdit} class="text-white font-semibold" aria-label="Edit">
      <!-- Pencil icon + "Edit" -->
      Edit
    </button>
  </div>

  <!-- Main content (slides with swipe) -->
  <div
    class="relative bg-white"
    style="transform: translateX({$offset}px)"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  >
    {@render children()}
  </div>
</div>
```

### DetailActions.svelte

```svelte
<script lang="ts">
  interface Props {
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
  }

  let { onEdit, onDelete, isDeleting = false }: Props = $props();
</script>

<!-- Desktop: hidden until hover on parent -->
<!-- Mobile: always visible but muted -->
<div class="flex gap-1 items-center
            opacity-0 group-hover:opacity-100
            sm:opacity-100 sm:opacity-30 sm:hover:opacity-100
            transition-opacity">
  <button
    onclick={onEdit}
    class="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-forest"
    aria-label="Edit"
  >
    <!-- Pencil icon -->
  </button>
  <button
    onclick={onDelete}
    disabled={isDeleting}
    class="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
    aria-label="Delete"
  >
    <!-- X icon -->
  </button>
</div>
```

### AddDetailDropdown.svelte

```svelte
<script lang="ts">
  type SubresourceType = 'phone' | 'email' | 'address' | 'url' | 'date' | 'socialProfile';

  interface Props {
    onAdd: (type: SubresourceType) => void;
  }

  let { onAdd }: Props = $props();
  let isOpen = $state(false);

  const options: { type: SubresourceType; label: string; icon: string }[] = [
    { type: 'phone', label: 'Phone Number', icon: 'phone' },
    { type: 'email', label: 'Email Address', icon: 'mail' },
    { type: 'address', label: 'Address', icon: 'map-pin' },
    { type: 'url', label: 'Website/URL', icon: 'link' },
    { type: 'date', label: 'Important Date', icon: 'calendar' },
    { type: 'socialProfile', label: 'Social Profile', icon: 'share' },
  ];
</script>

<div class="relative">
  <button
    onclick={() => isOpen = !isOpen}
    class="text-sm text-forest font-body font-semibold hover:text-forest-light
           flex items-center gap-1"
  >
    <span>+ Add</span>
    <!-- Chevron icon -->
  </button>

  {#if isOpen}
    <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg
                border border-gray-200 py-1 z-10">
      {#each options as option}
        <button
          onclick={() => { onAdd(option.type); isOpen = false; }}
          class="w-full px-4 py-2 text-left text-sm font-body text-gray-700
                 hover:bg-gray-50 flex items-center gap-2"
        >
          <!-- Dynamic icon -->
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
```

### DetailEditModal.svelte

```svelte
<script lang="ts">
  import { isModalOpen } from '$lib/stores/ui';

  type SubresourceType = 'phone' | 'email' | 'address' | 'url' | 'date' | 'socialProfile';

  interface Props {
    type: SubresourceType;
    mode: 'add' | 'edit';
    data?: Record<string, unknown>;
    onSave: (data: Record<string, unknown>) => Promise<void>;
    onClose: () => void;
  }

  let { type, mode, data = {}, onSave, onClose }: Props = $props();

  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let isDirty = $state(false);

  const titles: Record<SubresourceType, string> = {
    phone: 'Phone Number',
    email: 'Email Address',
    address: 'Address',
    url: 'Website/URL',
    date: 'Important Date',
    socialProfile: 'Social Profile',
  };

  // Mark modal as open for keyboard shortcut handling
  $effect(() => {
    isModalOpen.set(true);
    return () => isModalOpen.set(false);
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isLoading = true;
    error = null;

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData);
      await onSave(data);
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save';
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <!-- Modal content -->
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 id="modal-title" class="text-xl font-heading text-gray-900">
        {mode === 'add' ? 'Add' : 'Edit'} {titles[type]}
      </h2>
      <button
        onclick={handleClose}
        class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        aria-label="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Form -->
    <form onsubmit={handleSubmit} class="p-4 space-y-4">
      <!-- Dynamic form fields rendered based on type -->
      {#if type === 'phone'}
        <PhoneEditForm {data} onchange={() => isDirty = true} />
      {:else if type === 'email'}
        <EmailEditForm {data} onchange={() => isDirty = true} />
      <!-- ... other types ... -->
      {/if}

      <!-- Error message -->
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      {/if}

      <!-- Footer buttons -->
      <div class="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onclick={handleClose}
          disabled={isLoading}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold
                 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          class="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold
                 hover:bg-forest-light transition-colors disabled:opacity-50
                 flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          {:else}
            Save
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
```

### DeleteConfirmModal.svelte

```svelte
<script lang="ts">
  interface Props {
    title: string;
    description: string;
    itemPreview: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
  }

  let { title, description, itemPreview, onConfirm, onClose }: Props = $props();

  let isDeleting = $state(false);

  async function handleDelete() {
    isDeleting = true;
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      isDeleting = false;
    }
  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
  onclick={(e) => e.target === e.currentTarget && onClose()}
  role="dialog"
  aria-modal="true"
>
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
    <h2 class="text-xl font-heading text-gray-900 mb-2">{title}</h2>
    <p class="text-gray-600 font-body mb-4">{description}</p>

    <!-- Item preview -->
    <div class="bg-gray-50 rounded-lg p-3 mb-4 font-body text-gray-700">
      {itemPreview}
    </div>

    <p class="text-sm text-gray-500 font-body mb-6">
      This action cannot be undone.
    </p>

    <div class="flex gap-3">
      <button
        onclick={onClose}
        disabled={isDeleting}
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold
               text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onclick={handleDelete}
        disabled={isDeleting}
        class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold
               hover:bg-red-700 transition-colors disabled:opacity-50
               flex items-center justify-center gap-2"
      >
        {#if isDeleting}
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Deleting...
        {:else}
          Delete
        {/if}
      </button>
    </div>
  </div>
</div>
```

## Testing Strategy

### Unit Tests
- DetailActions button click handlers
- AddDetailDropdown menu open/close state
- SwipeableRow touch event handling and threshold calculations
- Keyboard shortcut event dispatching (`a+p`, `a+e`, etc.)
- DetailEditModal open/close/dirty state handling
- DeleteConfirmModal confirmation flow
- Form validation for each detail type

### Integration Tests
- Add detail flow (dropdown → modal → save → display)
- Edit detail flow (click edit → modal → save → updated display)
- Delete detail flow (click delete → confirm modal → removed from display)
- Swipe edit flow (swipe right → edit modal → save)
- Swipe delete flow (swipe left → confirm modal → removed)
- Keyboard shortcut flow (`a+p` → add phone modal opens)
- Modal unsaved changes warning on close
- Error handling for failed API calls (error displayed in modal)

### E2E Tests
- Complete add/edit/delete flows for each detail type
- Modal escape key closes modal
- Modal backdrop click closes modal
- Mobile touch interactions (tap icons)
- Mobile swipe gestures (swipe left/right)
- Desktop keyboard shortcuts for all detail types
- Keyboard navigation through modal form fields
- Partial swipe snap-back behavior

### Accessibility Tests
- Screen reader navigation
- Focus trapped inside modal while open
- Focus returns to trigger element on modal close
- Modal announced as dialog to screen readers
- Color contrast for action icons
- Keyboard shortcuts don't conflict with screen reader commands
- Swipe actions don't block icon-based accessibility (always-visible icons remain functional)
