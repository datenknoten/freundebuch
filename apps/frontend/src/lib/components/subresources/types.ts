/**
 * The shape a sub-resource descriptor has to satisfy, shared by every owner
 * that renders CRUD sections (friends and collectives today).
 *
 * A descriptor captures everything that varies between sub-resource types —
 * icon, i18n keys, API calls, row/form components and the per-type quirks
 * (address geocoding refetch, circle being add-only) — so
 * `subresource-section.svelte` can drive all of them with one implementation.
 *
 * Descriptors are written through {@link defineDescriptor}, which type-checks
 * each one against its own item and input types — a phone descriptor's form
 * has to hand `getData()` back as a `PhoneInput`, and its rows arrive as
 * `Phone`. The section works with the erased `SubresourceDescriptor`, because
 * it has no way to know which type it is driving; `defineDescriptor` is the
 * single place that erasure happens.
 */
import type { Component } from 'svelte';
import type { Address } from '$shared';

/** Translation function (`$i18n.t`), passed in so descriptors stay UI-framework agnostic. */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

/** Every sub-resource row carries at least an id. */
export interface SubresourceItem {
  id: string;
}

/** Methods every edit form exposes via `bind:this`. */
export interface SubresourceFormExports<TInput = unknown> {
  getData: () => TInput;
  isValid: () => boolean;
}

/**
 * An edit form as the *section* sees it: props it can spread into, exports it
 * can read. Descriptor literals use {@link AuthoredFormComponent} instead,
 * which constrains only the exports.
 */
export type SubresourceFormComponent<TInput = unknown> = Component<
  Record<string, unknown>,
  SubresourceFormExports<TInput>
>;

/**
 * An edit form as a *descriptor author* declares it. `never` props accept any
 * concrete prop interface (props are contravariant), so the only thing checked
 * is that `getData()` returns what this descriptor's `create`/`update` take.
 */
type AuthoredFormComponent<TInput> = Component<never, SubresourceFormExports<TInput>>;

/** Context handed to `formProps` so it can build the right props for each edit form. */
export interface FormPropsContext<TItem extends SubresourceItem = SubresourceItem> {
  editingData: TItem | null;
  editingId: string | null;
  itemCount: number;
  items: TItem[];
  isLoading: boolean;
}

/** `initialData` + `disabled`, the props every simple edit form takes. */
export function editFormProps<TItem extends SubresourceItem>({
  editingData,
  isLoading,
}: FormPropsContext<TItem>): Record<string, unknown> {
  return { initialData: editingData ?? undefined, disabled: isLoading };
}

/** The same, plus the "first entry is primary" default. */
export function primaryAwareFormProps<TItem extends SubresourceItem>(
  ctx: FormPropsContext<TItem>,
): Record<string, unknown> {
  return {
    ...editFormProps(ctx),
    defaultPrimary: ctx.editingId === null && ctx.itemCount === 0,
  };
}

/**
 * An address has no single naming field, so the delete dialog falls back
 * through street, city and finally a generic phrase.
 */
export function addressDeleteName(address: Address, t: Translate): string {
  if (address.streetLine1 !== undefined && address.streetLine1.length > 0) {
    return address.streetLine1;
  }
  if (address.city !== undefined && address.city.length > 0) return address.city;
  return t('subresources.address.thisAddress');
}

/** One entry in the "add detail" dropdown / bottom sheet. */
export interface AddDetailOption {
  key: string;
  icon: Component;
  /** i18n key for the entry's label. */
  labelKey: string;
  /** Window event dispatched when the entry is chosen. */
  event: string;
  /** `data-shortcut` chord (e.g. "a p"). */
  shortcut?: string;
  /** `data-shortcut-label` key; defaults to `labelKey`. */
  shortcutLabel?: string;
}

/** Build a menu entry from a descriptor, which already knows icon and event. */
export function addDetailOption(
  descriptor: SubresourceDescriptor,
  labelKey: string,
  shortcut?: string,
): AddDetailOption {
  return {
    key: descriptor.key,
    icon: descriptor.icon,
    labelKey,
    event: descriptor.shortcutEvent,
    shortcut: shortcut ?? descriptor.addShortcut,
    shortcutLabel: descriptor.addShortcutLabel,
  };
}

/** Everything both add paths share. */
interface SubresourceDescriptorBase<TItem extends SubresourceItem> {
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
  /**
   * Fetch the section's items. Omit when the owner passes `items` — the friend
   * detail page already holds them in its store.
   */
  load?: (ownerId: string) => Promise<TItem[]>;
  /** Receives the whole item, since some types delete by a secondary id. */
  remove: (ownerId: string, item: TItem) => Promise<unknown>;
  /** When the create/remove API returns only a message, reload instead of patching locally. */
  reloadAfterMutate?: boolean;
  /**
   * Side effect scheduled after a successful save (address geocoding refetch).
   * Receives the section's own reload and the owner id, so a descriptor whose
   * items live in a store can refetch the owner instead of the section.
   * Returns a cancel function; the section calls it when the owner changes or
   * the section unmounts, so a scheduled refetch never lands on another owner.
   */
  afterSave?: (reload: () => Promise<void>, ownerId: string) => () => void;
  RowComponent: Component;
  rowProps: (item: TItem) => Record<string, unknown>;
  /**
   * Whether this row registers a keyboard-openable link. Rows that do not get
   * no hint badge and consume no index, so the "o" sequence stays in step with
   * the link list the detail page registers. Defaults to every row.
   */
  linkable?: (item: TItem) => boolean;
  /** Preview text shown in the delete-confirm dialog. */
  deleteName: (item: TItem, t: Translate) => string;
  /** i18n key for the delete dialog's title. */
  deleteTitleKey: string;
  /** i18n key for the delete dialog's description. */
  deleteDescriptionKey: string;
  /** Optional type-specific error mapping (phone unknown-country hint). */
  mapError?: (err: unknown, t: Translate) => string | undefined;
}

/** The usual path: the section renders the shared edit modal around a form. */
interface FormDrivenArm<TItem extends SubresourceItem, TInput, TForm> {
  /** i18n key for the type name in the add/edit modal title. */
  modalTypeNameKey: string;
  FormComponent: TForm;
  formProps?: (ctx: FormPropsContext<TItem>) => Record<string, unknown>;
  create: (ownerId: string, data: TInput) => Promise<unknown>;
  update?: (ownerId: string, id: string, data: TInput) => Promise<TItem>;
  /**
   * Wire the edit form's `onchange` to dirty-tracking, so `DetailEditModal`
   * asks about unsaved changes on close.
   */
  tracksDirty?: boolean;
}

/** The friend → collective path: joining needs a component of its own. */
interface AddComponentArm<TAdd> {
  /** Replaces the add/edit modal entirely. */
  AddComponent: TAdd;
  /** Props for `AddComponent`; the section adds `onClose`. */
  addProps: (ctx: {
    ownerId: string;
    ownerName: string;
    items: SubresourceItem[];
  }) => Record<string, unknown>;
}

/** A descriptor as its author writes it, checked against its own types. */
export type AuthoredDescriptor<
  TItem extends SubresourceItem,
  TInput,
> = SubresourceDescriptorBase<TItem> &
  (FormDrivenArm<TItem, TInput, AuthoredFormComponent<TInput>> | AddComponentArm<Component<never>>);

/** A descriptor as the section consumes it, with the item/input types erased. */
export type SubresourceDescriptor = SubresourceDescriptorBase<SubresourceItem> &
  (
    | FormDrivenArm<SubresourceItem, unknown, SubresourceFormComponent>
    | AddComponentArm<Component<Record<string, unknown>>>
  );

/**
 * Register a descriptor. The argument is checked against the concrete item and
 * input types; the result is the erased shape the section renders, because the
 * section cannot know which type it is driving. This is the only place the two
 * views are bridged.
 */
export function defineDescriptor<TItem extends SubresourceItem, TInput>(
  descriptor: AuthoredDescriptor<TItem, TInput>,
): SubresourceDescriptor {
  return descriptor as unknown as SubresourceDescriptor;
}
