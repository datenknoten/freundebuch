// biome-ignore-all lint/correctness/useImportExtensions: Svelte imports need .svelte extension
/**
 * Data-driven descriptors for a collective's CRUD sub-resources
 * (phones / emails / addresses / urls / circles).
 *
 * Each descriptor captures everything that varies between the five types — the
 * icon, i18n keys, API calls, row/form components, and the per-type quirks
 * (address geocoding refetch, circle being add-only) — so that
 * `subresource-section.svelte` can drive all of them with a single, branch-free
 * implementation. This replaces the former central `editingType` discriminator
 * with its parallel `if/else` save chain and `switch` delete chain.
 */
import type { Component } from 'svelte';
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { ApiError } from '$lib/api/client';
import {
  addAddress,
  addCollectiveToCircle,
  addEmail,
  addPhone,
  addUrl,
  type CollectiveCircleInfo,
  deleteAddress,
  deleteEmail,
  deletePhone,
  deleteUrl,
  getCollectiveCircles,
  listAddresses,
  listEmails,
  listPhones,
  listUrls,
  removeCollectiveFromCircle,
  updateAddress,
  updateEmail,
  updatePhone,
  updateUrl,
} from '$lib/api/collectives';
import type {
  Address,
  AddressInput,
  Email,
  EmailInput,
  Phone,
  PhoneInput,
  Url,
  UrlInput,
} from '$shared';
import {
  AddressEditForm,
  AddressRow,
  CircleEditForm,
  CircleRow,
  EmailEditForm,
  EmailRow,
  PhoneEditForm,
  PhoneRow,
  UrlEditForm,
  UrlRow,
} from '../friends/subresources';

/** Translation function (`$i18n.t`), passed in so descriptors stay UI-framework agnostic. */
type Translate = (key: string, params?: Record<string, unknown>) => string;

export type SubresourceItem = Phone | Email | Address | Url | CollectiveCircleInfo;
type SubresourceInput = PhoneInput | EmailInput | AddressInput | UrlInput | { circleId: string };

/** Methods every edit form exposes via `bind:this`. */
export type SubresourceFormExports = { getData: () => unknown; isValid: () => boolean };
/** Edit form component whose instance (`bind:this`) exposes {@link SubresourceFormExports}. */
type SubresourceFormComponent = Component<Record<string, unknown>, SubresourceFormExports>;
const asFormComponent = (component: unknown): SubresourceFormComponent =>
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
  key: 'phone' | 'email' | 'address' | 'url' | 'circle';
  /** Window event the keyboard system dispatches to open this section's add modal. */
  shortcutEvent: string;
  icon: Component;
  /** i18n key for the section heading. */
  sectionTitleKey: string;
  /** i18n key for the "Add …" button label. */
  addLabelKey: string;
  /** `data-shortcut` chord shown on the add button (e.g. "a p"). */
  addShortcut: string;
  /** `data-shortcut-label` i18n key for the add button. */
  addShortcutLabel: string;
  /** Circle is add-only (no inline edit). */
  editable: boolean;
  /** i18n key for the type name in the add/edit modal title; falls back to `modalTypeNameLiteral`. */
  modalTypeNameKey?: string;
  /** Literal type name when there is no i18n key (circle preserves the original 'Circle'). */
  modalTypeNameLiteral?: string;
  load: (collectiveId: string) => Promise<SubresourceItem[]>;
  create: (
    collectiveId: string,
    data: SubresourceInput,
  ) => Promise<SubresourceItem | { message: string }>;
  update?: (collectiveId: string, id: string, data: SubresourceInput) => Promise<SubresourceItem>;
  remove: (collectiveId: string, id: string) => Promise<unknown>;
  /** When the create/remove API returns only a message (circle), reload instead of patching locally. */
  reloadAfterMutate?: boolean;
  /**
   * Wire the edit form's `onchange` to dirty-tracking, so `DetailEditModal`
   * prompts about unsaved changes on close. Pre-refactor only the circle form
   * did this; phone/email/address/url intentionally never prompted.
   */
  tracksDirty?: boolean;
  /** Side effect scheduled after a successful save (address geocoding refetch). */
  afterSave?: (reload: () => Promise<void>) => void;
  FormComponent: SubresourceFormComponent;
  formProps: (ctx: FormPropsContext) => Record<string, unknown>;
  RowComponent: Component;
  rowProps: (item: SubresourceItem) => Record<string, unknown>;
  /** Preview text shown in the delete-confirm modal. */
  deleteName: (item: SubresourceItem, t: Translate) => string;
  /** Literal delete-modal title (preserves the original hardcoded English). */
  deleteTitle: string;
  /** Literal delete-modal description. */
  deleteDescription: string;
  /** Optional type-specific error mapping (phone unknown-country hint). */
  mapError?: (err: unknown, t: Translate) => string | undefined;
}

const phoneDescriptor: SubresourceDescriptor = {
  key: 'phone',
  shortcutEvent: 'shortcut:collective-add-phone',
  icon: PhoneIcon,
  sectionTitleKey: 'friendDetail.sections.phoneNumbers',
  addLabelKey: 'friendDetail.actions.addPhone',
  addShortcut: 'a p',
  addShortcutLabel: 'shortcuts.add.phone',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.phoneNumber',
  load: (cid) => listPhones(cid),
  create: (cid, data) => addPhone(cid, data as PhoneInput),
  update: (cid, id, data) => updatePhone(cid, id, data as PhoneInput),
  remove: (cid, id) => deletePhone(cid, id),
  FormComponent: asFormComponent(PhoneEditForm),
  formProps: ({ editingData, editingId, itemCount, isLoading }) => ({
    initialData: (editingData as Phone | null) ?? undefined,
    defaultPrimary: !editingId && itemCount === 0,
    disabled: isLoading,
  }),
  RowComponent: PhoneRow,
  rowProps: (item) => ({ phone: item as Phone }),
  deleteName: (item) => (item as Phone).phoneNumber,
  deleteTitle: 'Delete Phone Number',
  deleteDescription: 'Are you sure you want to delete this phone?',
  mapError: (err, t) =>
    err instanceof ApiError && err.code === 'PHONE_COUNTRY_UNKNOWN'
      ? t('subresources.phone.unknownCountry')
      : undefined,
};

const emailDescriptor: SubresourceDescriptor = {
  key: 'email',
  shortcutEvent: 'shortcut:collective-add-email',
  icon: Envelope,
  sectionTitleKey: 'friendDetail.sections.emailAddresses',
  addLabelKey: 'friendDetail.actions.addEmail',
  addShortcut: 'a e',
  addShortcutLabel: 'shortcuts.add.email',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.emailAddress',
  load: (cid) => listEmails(cid),
  create: (cid, data) => addEmail(cid, data as EmailInput),
  update: (cid, id, data) => updateEmail(cid, id, data as EmailInput),
  remove: (cid, id) => deleteEmail(cid, id),
  FormComponent: asFormComponent(EmailEditForm),
  formProps: ({ editingData, editingId, itemCount, isLoading }) => ({
    initialData: (editingData as Email | null) ?? undefined,
    defaultPrimary: !editingId && itemCount === 0,
    disabled: isLoading,
  }),
  RowComponent: EmailRow,
  rowProps: (item) => ({ email: item as Email }),
  deleteName: (item) => (item as Email).emailAddress,
  deleteTitle: 'Delete Email Address',
  deleteDescription: 'Are you sure you want to delete this email?',
};

const addressDescriptor: SubresourceDescriptor = {
  key: 'address',
  shortcutEvent: 'shortcut:collective-add-address',
  icon: MapPin,
  sectionTitleKey: 'friendDetail.sections.addresses',
  addLabelKey: 'friendDetail.actions.addAddress',
  addShortcut: 'a a',
  addShortcutLabel: 'shortcuts.add.address',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.address',
  load: (cid) => listAddresses(cid),
  create: (cid, data) => addAddress(cid, data as AddressInput),
  update: (cid, id, data) => updateAddress(cid, id, data as AddressInput),
  remove: (cid, id) => deleteAddress(cid, id),
  // Geocoding runs asynchronously on the backend; refetch a few times to pick up
  // coordinates once they land.
  afterSave: (reload) => {
    for (const delay of [800, 2000, 4500]) {
      setTimeout(() => {
        reload().catch(() => undefined);
      }, delay);
    }
  },
  FormComponent: asFormComponent(AddressEditForm),
  formProps: ({ editingData, editingId, itemCount, isLoading }) => ({
    initialData: (editingData as Address | null) ?? undefined,
    defaultPrimary: !editingId && itemCount === 0,
    disabled: isLoading,
  }),
  RowComponent: AddressRow,
  rowProps: (item) => ({ address: item as Address }),
  deleteName: (item, t) => {
    const address = item as Address;
    return address.streetLine1 || address.city || t('subresources.address.thisAddress');
  },
  deleteTitle: 'Delete Address',
  deleteDescription: 'Are you sure you want to delete this address?',
};

const urlDescriptor: SubresourceDescriptor = {
  key: 'url',
  shortcutEvent: 'shortcut:collective-add-url',
  icon: Link,
  sectionTitleKey: 'friendDetail.sections.websites',
  addLabelKey: 'friendDetail.actions.addUrl',
  addShortcut: 'a u',
  addShortcutLabel: 'shortcuts.add.url',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.websiteUrl',
  load: (cid) => listUrls(cid),
  create: (cid, data) => addUrl(cid, data as UrlInput),
  update: (cid, id, data) => updateUrl(cid, id, data as UrlInput),
  remove: (cid, id) => deleteUrl(cid, id),
  FormComponent: asFormComponent(UrlEditForm),
  formProps: ({ editingData, isLoading }) => ({
    initialData: (editingData as Url | null) ?? undefined,
    disabled: isLoading,
  }),
  RowComponent: UrlRow,
  rowProps: (item) => ({ url: item as Url }),
  deleteName: (item) => (item as Url).url,
  deleteTitle: 'Delete Website',
  deleteDescription: 'Are you sure you want to delete this url?',
};

const circleDescriptor: SubresourceDescriptor = {
  key: 'circle',
  shortcutEvent: 'shortcut:collective-add-circle',
  icon: Users,
  sectionTitleKey: 'friendDetail.sections.circles',
  addLabelKey: 'friendDetail.actions.addCircle',
  addShortcut: 'a c',
  addShortcutLabel: 'shortcuts.add.circle',
  editable: false,
  modalTypeNameLiteral: 'Circle',
  load: (cid) => getCollectiveCircles(cid),
  create: (cid, data) => addCollectiveToCircle(cid, (data as { circleId: string }).circleId),
  remove: (cid, id) => removeCollectiveFromCircle(cid, id),
  reloadAfterMutate: true,
  tracksDirty: true,
  FormComponent: asFormComponent(CircleEditForm),
  formProps: ({ items, isLoading }) => ({
    existingCircles: items as CollectiveCircleInfo[],
    disabled: isLoading,
  }),
  RowComponent: CircleRow,
  rowProps: (item) => ({ circle: item as CollectiveCircleInfo }),
  deleteName: (item) => (item as CollectiveCircleInfo).name,
  deleteTitle: 'Remove from Circle',
  deleteDescription: 'Are you sure you want to remove this collective from this circle?',
};

/** Phone/email/address/url — rendered inside the contact-details wrapper, in this order. */
export const contactDescriptors: SubresourceDescriptor[] = [
  phoneDescriptor,
  emailDescriptor,
  addressDescriptor,
  urlDescriptor,
];

/** Circle — rendered as its own top-level section, matching the original layout. */
export { circleDescriptor };

/**
 * Every sub-resource a collective can gain via the "add detail" entry point
 * (FAB menu on mobile, dropdown on desktop), in display order. Members are
 * intentionally excluded — the member section always renders its own add
 * button, whereas these contact/circle sections hide when empty and would
 * otherwise be unreachable. Each descriptor already carries the icon and the
 * window event that opens its add modal, so the picker stays data-driven.
 */
export const detailDescriptors: SubresourceDescriptor[] = [...contactDescriptors, circleDescriptor];
