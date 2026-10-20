// biome-ignore-all lint/correctness/useImportExtensions: Svelte imports need .svelte extension
/**
 * Data-driven descriptors for a collective's CRUD sub-resources
 * (phones / emails / addresses / urls / circles).
 *
 * Each descriptor captures everything that varies between the five types — the
 * icon, i18n keys, API calls, row/form components, and the per-type quirks
 * (address geocoding refetch, circle being add-only) — so that
 * `SubresourceSection.svelte` can drive all of them with a single, branch-free
 * implementation.
 */
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import type { AddressData } from '$lib/api/address-data.js';
import { ApiError } from '$lib/api/api-error.js';
import type { CollectiveContactsApi } from '$lib/api/collective-contacts.js';
import type { CollectivesApi } from '$lib/api/collectives.js';
import type { EmailData } from '$lib/api/email-data.js';
import type { PhoneData } from '$lib/api/phone-data.js';
import type { UrlData } from '$lib/api/url-data.js';
import type {
  AddressResponse,
  CollectiveCircleResponse,
  EmailResponse,
  PhoneResponse,
  UrlResponse,
} from '$shared';
import AddressEditForm from '../friends/subresources/AddressEditForm.svelte';
import AddressRow from '../friends/subresources/AddressRow.svelte';
import CircleEditForm from '../friends/subresources/CircleEditForm.svelte';
import CircleRow from '../friends/subresources/CircleRow.svelte';
import EmailEditForm from '../friends/subresources/EmailEditForm.svelte';
import EmailRow from '../friends/subresources/EmailRow.svelte';
import PhoneEditForm from '../friends/subresources/PhoneEditForm.svelte';
import PhoneRow from '../friends/subresources/PhoneRow.svelte';
import UrlEditForm from '../friends/subresources/UrlEditForm.svelte';
import UrlRow from '../friends/subresources/UrlRow.svelte';
import {
  addDetailOption,
  addressDeleteName,
  defineDescriptor,
  editFormProps,
  primaryAwareFormProps,
  type SubresourceDescriptor,
  type Translate,
} from '../subresources/types';

export interface CollectiveDescriptorsOptions {
  collectivesApi: CollectivesApi;
  collectiveContactsApi: CollectiveContactsApi;
}

const ADDRESS_REFETCH_DELAYS_MS = [800, 2000, 4500];

function mapPhoneError(err: unknown, t: Translate) {
  if (err instanceof ApiError === false) {
    return undefined;
  }
  if (err.code === 'PHONE_COUNTRY_UNKNOWN') {
    return t('subresources.phone.unknownCountry');
  }
  // The backend rejects unparseable numbers with a 400 and a message meant
  // for developers; show the field hint instead.
  if (err.statusCode === 400) {
    return t('subresources.phone.invalidNumber');
  }
  return undefined;
}

// Geocoding runs asynchronously on the backend; refetch a few times to pick up
// coordinates once they land.
function refetchUntilGeocoded(reload: () => Promise<unknown>) {
  const timers = ADDRESS_REFETCH_DELAYS_MS.map((delay) =>
    setTimeout(() => void reload().catch(() => undefined), delay),
  );
  return function cancelRefetch() {
    for (const timer of timers) {
      clearTimeout(timer);
    }
  };
}

function createPhoneDescriptor(api: CollectiveContactsApi) {
  return defineDescriptor<PhoneResponse, PhoneData>({
    key: 'phone',
    shortcutEvent: 'shortcut:collective-add-phone',
    icon: PhoneIcon,
    sectionTitleKey: 'friendDetail.sections.phoneNumbers',
    addLabelKey: 'friendDetail.actions.addPhone',
    addShortcut: 'a p',
    addShortcutLabel: 'shortcuts.add.phone',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.phoneNumber',
    load: (cid) => api.listPhones(cid),
    create: (cid, data) => api.addPhone(cid, data),
    update: (cid, id, data) => api.updatePhone(cid, id, data),
    remove: (cid, item) => api.deletePhone(cid, item.id),
    FormComponent: PhoneEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: PhoneRow,
    rowProps: (phone) => ({ phone }),
    deleteName: (phone) => phone.phoneNumber,
    deleteTitleKey: 'friendDetail.modal.deletePhoneNumber',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeletePhone',
    mapError: mapPhoneError,
  });
}

function createEmailDescriptor(api: CollectiveContactsApi) {
  return defineDescriptor<EmailResponse, EmailData>({
    key: 'email',
    shortcutEvent: 'shortcut:collective-add-email',
    icon: Envelope,
    sectionTitleKey: 'friendDetail.sections.emailAddresses',
    addLabelKey: 'friendDetail.actions.addEmail',
    addShortcut: 'a e',
    addShortcutLabel: 'shortcuts.add.email',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.emailAddress',
    load: (cid) => api.listEmails(cid),
    create: (cid, data) => api.addEmail(cid, data),
    update: (cid, id, data) => api.updateEmail(cid, id, data),
    remove: (cid, item) => api.deleteEmail(cid, item.id),
    FormComponent: EmailEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: EmailRow,
    rowProps: (email) => ({ email }),
    deleteName: (email) => email.emailAddress,
    deleteTitleKey: 'friendDetail.modal.deleteEmailAddress',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmail',
  });
}

function createAddressDescriptor(api: CollectiveContactsApi) {
  return defineDescriptor<AddressResponse, AddressData>({
    key: 'address',
    shortcutEvent: 'shortcut:collective-add-address',
    icon: MapPin,
    sectionTitleKey: 'friendDetail.sections.addresses',
    addLabelKey: 'friendDetail.actions.addAddress',
    addShortcut: 'a a',
    addShortcutLabel: 'shortcuts.add.address',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.address',
    load: (cid) => api.listAddresses(cid),
    create: (cid, data) => api.addAddress(cid, data),
    update: (cid, id, data) => api.updateAddress(cid, id, data),
    remove: (cid, item) => api.deleteAddress(cid, item.id),
    afterSave: refetchUntilGeocoded,
    FormComponent: AddressEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: AddressRow,
    rowProps: (address) => ({ address }),
    deleteName: addressDeleteName,
    deleteTitleKey: 'friendDetail.modal.deleteAddress',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteAddress',
  });
}

function createUrlDescriptor(api: CollectiveContactsApi) {
  return defineDescriptor<UrlResponse, UrlData>({
    key: 'url',
    shortcutEvent: 'shortcut:collective-add-url',
    icon: Link,
    sectionTitleKey: 'friendDetail.sections.websites',
    addLabelKey: 'friendDetail.actions.addUrl',
    addShortcut: 'a u',
    addShortcutLabel: 'shortcuts.add.url',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.websiteUrl',
    load: (cid) => api.listUrls(cid),
    create: (cid, data) => api.addUrl(cid, data),
    update: (cid, id, data) => api.updateUrl(cid, id, data),
    remove: (cid, item) => api.deleteUrl(cid, item.id),
    FormComponent: UrlEditForm,
    formProps: editFormProps,
    RowComponent: UrlRow,
    rowProps: (url) => ({ url }),
    deleteName: (url) => url.url,
    deleteTitleKey: 'friendDetail.modal.deleteWebsite',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteWebsite',
  });
}

function createCircleDescriptor(api: CollectivesApi) {
  return defineDescriptor<CollectiveCircleResponse, { circleId: string }>({
    key: 'circle',
    shortcutEvent: 'shortcut:collective-add-circle',
    icon: Users,
    sectionTitleKey: 'friendDetail.sections.circles',
    addLabelKey: 'friendDetail.actions.addCircle',
    addShortcut: 'a c',
    addShortcutLabel: 'shortcuts.add.circle',
    editable: false,
    modalTypeNameKey: 'friendDetail.modal.circle',
    load: (cid) => api.listCollectiveCircles(cid),
    create: (cid, data) => api.addCollectiveToCircle(cid, data.circleId),
    remove: (cid, item) => api.removeCollectiveFromCircle(cid, item.id),
    reloadAfterMutate: true,
    tracksDirty: true,
    FormComponent: CircleEditForm,
    formProps: ({ items, isLoading }) => ({ existingCircles: items, disabled: isLoading }),
    RowComponent: CircleRow,
    rowProps: (circle) => ({ circle }),
    deleteName: (circle) => circle.name,
    deleteTitleKey: 'collectives.detail.removeFromCircleTitle',
    deleteDescriptionKey: 'collectives.detail.confirmRemoveCircle',
  });
}

/**
 * `contactDescriptors` render inside the contact-details wrapper, in this order; the circle
 * descriptor renders as its own top-level section. `addDetailOptions` lists every sub-resource a
 * collective can gain via the "add detail" entry point, in display order. Members are excluded:
 * the member section always renders its own add button, whereas these sections hide when empty
 * and would otherwise be unreachable.
 */
export function createCollectiveDescriptors(options: CollectiveDescriptorsOptions) {
  const contactDescriptors: SubresourceDescriptor[] = [
    createPhoneDescriptor(options.collectiveContactsApi),
    createEmailDescriptor(options.collectiveContactsApi),
    createAddressDescriptor(options.collectiveContactsApi),
    createUrlDescriptor(options.collectiveContactsApi),
  ];
  const circleDescriptor = createCircleDescriptor(options.collectivesApi);
  const addDetailOptions = [...contactDescriptors, circleDescriptor].map((descriptor) =>
    addDetailOption(descriptor, `shortcuts.add.${descriptor.key}`),
  );
  return { contactDescriptors, circleDescriptor, addDetailOptions };
}
