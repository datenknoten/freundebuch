// biome-ignore-all lint/correctness/useImportExtensions: Svelte imports need .svelte extension

// Shared UI Components
export { default as DetailActions } from './DetailActions.svelte';
export { default as SwipeableRow } from './SwipeableRow.svelte';
export { default as DeleteConfirmModal } from './DeleteConfirmModal.svelte';
export { default as DetailEditModal } from './DetailEditModal.svelte';

// Edit Form Components
export { default as PhoneEditForm } from './PhoneEditForm.svelte';
export { default as EmailEditForm } from './EmailEditForm.svelte';
export { default as UrlEditForm } from './UrlEditForm.svelte';
export { default as DateEditForm } from './DateEditForm.svelte';
export { default as SocialProfileEditForm } from './SocialProfileEditForm.svelte';
export { default as AddressEditForm } from './AddressEditForm.svelte';

// Row Components
export { default as PhoneRow } from './PhoneRow.svelte';
export { default as EmailRow } from './EmailRow.svelte';
export { default as UrlRow } from './UrlRow.svelte';
export { default as DateRow } from './DateRow.svelte';
export { default as SocialProfileRow } from './SocialProfileRow.svelte';
export { default as AddressRow } from './AddressRow.svelte';

// Types
export type { SubresourceType } from './AddDetailDropdown.svelte';
