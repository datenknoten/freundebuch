/**
 * The shape a sub-resource descriptor has to satisfy, shared by every owner
 * that renders CRUD sections (friends and collectives today).
 *
 * A descriptor captures everything that varies between sub-resource types —
 * icon, i18n keys, API calls, row/form components and the per-type quirks
 * (address geocoding refetch, circle being add-only) — so
 * `subresource-section.svelte` can drive all of them with one branch-free
 * implementation.
 */
import type { Component } from 'svelte';

/** Translation function (`$i18n.t`), passed in so descriptors stay UI-framework agnostic. */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

/** Every sub-resource row carries at least an id. */
export interface SubresourceItem {
  id: string;
}

/**
 * Read an item at the concrete type its own descriptor declared.
 *
 * The section only ever hands a descriptor the items that descriptor's own
 * `load`/`create` produced, so the descriptor knows the real type while the
 * generic section does not. Keeping the assertion in one named place means no
 * call site fabricates a shape inline.
 */
export const itemAs = <T>(item: SubresourceItem): T => item as unknown as T;

/** Methods every edit form exposes via `bind:this`. */
export type SubresourceFormExports = { getData: () => unknown; isValid: () => boolean };

/** Edit form component whose instance (`bind:this`) exposes {@link SubresourceFormExports}. */
export type SubresourceFormComponent = Component<Record<string, unknown>, SubresourceFormExports>;

export const asFormComponent = (component: unknown): SubresourceFormComponent =>
  component as SubresourceFormComponent;

/** Context handed to `formProps` so it can build the right props for each edit form. */
export interface FormPropsContext {
  editingData: SubresourceItem | null;
  editingId: string | null;
  itemCount: number;
  items: SubresourceItem[];
  isLoading: boolean;
}

export interface SubresourceDescriptor {
  key: string;
  /** Window event the keyboard system dispatches to open this section's add modal. */
  shortcutEvent: string;
  icon: Component;
  /** i18n key for the section heading. */
  sectionTitleKey: string;
  /** i18n key for the "Add …" button label. */
  addLabelKey: string;
  /** `data-shortcut` chord shown on the add button (e.g. "a p"); omit for none. */
  addShortcut?: string;
  /** `data-shortcut-label` i18n key for the add button. */
  addShortcutLabel?: string;
  /** Add-only types (circle, collective) have no inline edit. */
  editable: boolean;
  /** i18n key for the type name in the add/edit modal title. */
  modalTypeNameKey?: string;
  /** Literal type name when there is no i18n key. */
  modalTypeNameLiteral?: string;
  /**
   * Fetch the section's items. Omit when the owner passes `items` — the friend
   * detail page already holds them in its store.
   */
  load?: (ownerId: string) => Promise<SubresourceItem[]>;
  create: (ownerId: string, data: never) => Promise<unknown>;
  update?: (ownerId: string, id: string, data: never) => Promise<SubresourceItem>;
  /** Receives the whole item, since some types delete by a secondary id. */
  remove: (ownerId: string, item: SubresourceItem) => Promise<unknown>;
  /** When the create/remove API returns only a message, reload instead of patching locally. */
  reloadAfterMutate?: boolean;
  /**
   * Wire the edit form's `onchange` to dirty-tracking, so `DetailEditModal`
   * prompts about unsaved changes on close.
   */
  tracksDirty?: boolean;
  /**
   * Side effect scheduled after a successful save (address geocoding refetch).
   * Receives the section's own reload and the owner id, so a descriptor whose
   * items live in a store can refetch the owner instead of the section.
   */
  afterSave?: (reload: () => Promise<void>, ownerId: string) => void;
  /** Replaces the add/edit modal entirely (the friend → collective flow). */
  AddComponent?: Component<Record<string, unknown>>;
  /** Props for `AddComponent`; the section adds `onClose`. */
  addProps?: (ctx: {
    ownerId: string;
    ownerName: string;
    items: SubresourceItem[];
  }) => Record<string, unknown>;
  FormComponent?: SubresourceFormComponent;
  formProps?: (ctx: FormPropsContext) => Record<string, unknown>;
  RowComponent: Component;
  rowProps: (item: SubresourceItem) => Record<string, unknown>;
  /**
   * Whether this row registers a keyboard-openable link. Rows that do not get
   * no hint badge and consume no index, so the "o" sequence stays in step with
   * the link list the detail page registers. Defaults to every row.
   */
  linkable?: (item: SubresourceItem) => boolean;
  /** Preview text shown in the delete-confirm dialog. */
  deleteName: (item: SubresourceItem, t: Translate) => string;
  /** i18n key for the delete dialog's title. */
  deleteTitleKey: string;
  /** i18n key for the delete dialog's description. */
  deleteDescriptionKey: string;
  /** Optional type-specific error mapping (phone unknown-country hint). */
  mapError?: (err: unknown, t: Translate) => string | undefined;
}
