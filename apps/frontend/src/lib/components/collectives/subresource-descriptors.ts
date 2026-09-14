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
import { asFormComponent, itemAs, type SubresourceDescriptor } from '../subresources/types';

/**
 * The descriptor shape, the item/form types and the `itemAs` reader all live in
 * `../subresources/types`, shared with the friend detail sections.
 */
export type {
  FormPropsContext,
  SubresourceDescriptor,
  SubresourceFormExports,
  SubresourceItem,
} from '../subresources/types';

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
  create: (cid, data: PhoneInput) => addPhone(cid, data),
  update: (cid, id, data: PhoneInput) => updatePhone(cid, id, data),
  remove: (cid, item) => deletePhone(cid, item.id),
  FormComponent: asFormComponent(PhoneEditForm),
  formProps: ({ editingData, editingId, itemCount, isLoading }) => ({
    initialData: editingData ?? undefined,
    defaultPrimary: editingId === null && itemCount === 0,
    disabled: isLoading,
  }),
  RowComponent: PhoneRow,
  rowProps: (item) => ({ phone: itemAs<Phone>(item) }),
  deleteName: (item) => itemAs<Phone>(item).phoneNumber,
  deleteTitleKey: 'friendDetail.modal.deletePhoneNumber',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeletePhone',
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
  create: (cid, data: EmailInput) => addEmail(cid, data),
  update: (cid, id, data: EmailInput) => updateEmail(cid, id, data),
  remove: (cid, item) => deleteEmail(cid, item.id),
  FormComponent: asFormComponent(EmailEditForm),
  formProps: ({ editingData, editingId, itemCount, isLoading }) => ({
    initialData: editingData ?? undefined,
    defaultPrimary: editingId === null && itemCount === 0,
    disabled: isLoading,
  }),
  RowComponent: EmailRow,
  rowProps: (item) => ({ email: itemAs<Email>(item) }),
  deleteName: (item) => itemAs<Email>(item).emailAddress,
  deleteTitleKey: 'friendDetail.modal.deleteEmailAddress',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmail',
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
  create: (cid, data: AddressInput) => addAddress(cid, data),
  update: (cid, id, data: AddressInput) => updateAddress(cid, id, data),
  remove: (cid, item) => deleteAddress(cid, item.id),
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
    initialData: editingData ?? undefined,
    defaultPrimary: editingId === null && itemCount === 0,
    disabled: isLoading,
  }),
  RowComponent: AddressRow,
  rowProps: (item) => ({ address: itemAs<Address>(item) }),
  deleteName: (item, t) => {
    const address = itemAs<Address>(item);
    return address.streetLine1 || address.city || t('subresources.address.thisAddress');
  },
  deleteTitleKey: 'friendDetail.modal.deleteAddress',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteAddress',
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
  create: (cid, data: UrlInput) => addUrl(cid, data),
  update: (cid, id, data: UrlInput) => updateUrl(cid, id, data),
  remove: (cid, item) => deleteUrl(cid, item.id),
  FormComponent: asFormComponent(UrlEditForm),
  formProps: ({ editingData, isLoading }) => ({
    initialData: editingData ?? undefined,
    disabled: isLoading,
  }),
  RowComponent: UrlRow,
  rowProps: (item) => ({ url: itemAs<Url>(item) }),
  deleteName: (item) => itemAs<Url>(item).url,
  deleteTitleKey: 'friendDetail.modal.deleteWebsite',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteWebsite',
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
  modalTypeNameKey: 'friendDetail.modal.circle',
  load: (cid) => getCollectiveCircles(cid),
  create: (cid, data: { circleId: string }) => addCollectiveToCircle(cid, data.circleId),
  remove: (cid, item) => removeCollectiveFromCircle(cid, item.id),
  reloadAfterMutate: true,
  tracksDirty: true,
  FormComponent: asFormComponent(CircleEditForm),
  formProps: ({ items, isLoading }) => ({
    existingCircles: items.map((item) => itemAs<CollectiveCircleInfo>(item)),
    disabled: isLoading,
  }),
  RowComponent: CircleRow,
  rowProps: (item) => ({ circle: itemAs<CollectiveCircleInfo>(item) }),
  deleteName: (item) => itemAs<CollectiveCircleInfo>(item).name,
  deleteTitleKey: 'collectives.detail.removeFromCircleTitle',
  deleteDescriptionKey: 'collectives.detail.confirmRemoveCircle',
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
