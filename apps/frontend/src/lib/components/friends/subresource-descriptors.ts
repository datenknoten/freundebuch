/**
 * Data-driven descriptors for a friend's CRUD sub-resources.
 *
 * Each descriptor captures everything that varies between the types — icon,
 * i18n keys, store calls, row/form components and the per-type quirks — so
 * `subresources/SubresourceSection.svelte` drives all of them with one
 * implementation instead of nine near-identical section components.
 *
 * Unlike the collectives descriptors these never `load` (notes aside): the
 * friend detail page already holds every sub-resource in the friends store, so
 * the section is handed `items` and the store's own optimistic updates
 * re-render it. The descriptors close over the store and APIs they are built
 * with, so the detail page builds them from its app context.
 */
import Briefcase from 'svelte-heros-v2/Briefcase.svelte';
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import Share from 'svelte-heros-v2/Share.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import type { AddressData } from '$lib/api/address-data.js';
import { ApiError } from '$lib/api/api-error.js';
import type { CollectiveMembersApi } from '$lib/api/collective-members.js';
import type { EmailData } from '$lib/api/email-data.js';
import type {
  DateData,
  ProfessionalHistoryData,
  SocialProfileData,
} from '$lib/api/friend-details.js';
import type { FriendNoteData, FriendNotesApi } from '$lib/api/friend-notes.js';
import type { PhoneData } from '$lib/api/phone-data.js';
import type { UrlData } from '$lib/api/url-data.js';
import AddressEditForm from '$lib/components/friends/subresources/AddressEditForm.svelte';
import AddressRow from '$lib/components/friends/subresources/AddressRow.svelte';
import AddToCollectiveModal from '$lib/components/friends/subresources/AddToCollectiveModal.svelte';
import CircleEditForm from '$lib/components/friends/subresources/CircleEditForm.svelte';
import CircleRow from '$lib/components/friends/subresources/CircleRow.svelte';
import CollectiveRow from '$lib/components/friends/subresources/CollectiveRow.svelte';
import DateEditForm from '$lib/components/friends/subresources/DateEditForm.svelte';
import DateRow from '$lib/components/friends/subresources/DateRow.svelte';
import EmailEditForm from '$lib/components/friends/subresources/EmailEditForm.svelte';
import EmailRow from '$lib/components/friends/subresources/EmailRow.svelte';
import NoteEditForm from '$lib/components/friends/subresources/NoteEditForm.svelte';
import NoteRow from '$lib/components/friends/subresources/NoteRow.svelte';
import PhoneEditForm from '$lib/components/friends/subresources/PhoneEditForm.svelte';
import PhoneRow from '$lib/components/friends/subresources/PhoneRow.svelte';
import ProfessionalHistoryEditForm from '$lib/components/friends/subresources/ProfessionalHistoryEditForm.svelte';
import ProfessionalHistoryRow from '$lib/components/friends/subresources/ProfessionalHistoryRow.svelte';
import SocialProfileEditForm from '$lib/components/friends/subresources/SocialProfileEditForm.svelte';
import SocialProfileRow from '$lib/components/friends/subresources/SocialProfileRow.svelte';
import UrlEditForm from '$lib/components/friends/subresources/UrlEditForm.svelte';
import UrlRow from '$lib/components/friends/subresources/UrlRow.svelte';
import type { FriendsStore } from '$lib/stores/friends.js';
import type {
  AddressResponse,
  CircleSummaryResponse,
  ContactCollectiveSummaryResponse,
  EmailResponse,
  FriendDateResponse,
  FriendNoteResponse,
  PhoneResponse,
  ProfessionalHistoryResponse,
  SocialProfileResponse,
  UrlResponse,
} from '$shared';
import {
  type AddDetailOption,
  addDetailOption,
  addressDeleteName,
  defineDescriptor,
  editFormProps,
  primaryAwareFormProps,
  type SubresourceDescriptor,
  type Translate,
} from '../subresources/types.js';
import { noteExcerpt } from './subresources/note-excerpt.js';

export interface FriendDescriptorsOptions {
  friendsStore: FriendsStore;
  friendNotesApi: FriendNotesApi;
}

export interface CollectiveDescriptorOptions {
  collectiveMembersApi: CollectiveMembersApi;
  /** Called after a membership was removed, so the page refetches the friend's collectives. */
  onChanged: () => void;
}

export interface FriendDescriptors {
  phone: SubresourceDescriptor;
  email: SubresourceDescriptor;
  address: SubresourceDescriptor;
  url: SubresourceDescriptor;
  socialProfile: SubresourceDescriptor;
  date: SubresourceDescriptor;
  professionalHistory: SubresourceDescriptor;
  circle: SubresourceDescriptor;
  note: SubresourceDescriptor;
}

/** Geocoding runs on the backend after the write commits; these refetches pick its result up. */
const ADDRESS_REFETCH_DELAYS_MS = [800, 2000, 4500];

/**
 * A social profile is only openable when it carries a URL. Shared with
 * `FriendDetail.svelte`, which builds the "o" link list from the same rule.
 */
export function hasProfileUrl(
  profile: SocialProfileResponse,
): profile is SocialProfileResponse & { profileUrl: string } {
  return (
    profile.profileUrl !== null && profile.profileUrl !== undefined && profile.profileUrl.length > 0
  );
}

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

/** The friend store owns addresses, so refetch the friend; the section's own reload is inert here. */
function scheduleAddressRefetch(friendsStore: FriendsStore, friendId: string) {
  function refetchFriend() {
    void friendsStore.refreshFriend(friendId);
  }
  const timers = ADDRESS_REFETCH_DELAYS_MS.map((delay) => setTimeout(refetchFriend, delay));
  return function cancelAddressRefetch() {
    for (const timer of timers) {
      clearTimeout(timer);
    }
  };
}

export function createFriendDescriptors(options: FriendDescriptorsOptions) {
  const { friendsStore, friendNotesApi } = options;

  const phone = defineDescriptor<PhoneResponse, PhoneData>({
    key: 'phone',
    shortcutEvent: 'shortcut:add-phone',
    icon: PhoneIcon,
    sectionTitleKey: 'friendDetail.sections.phoneNumbers',
    addLabelKey: 'friendDetail.actions.addPhone',
    addShortcut: 'a p',
    addShortcutLabel: 'shortcuts.add.phone',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.phoneNumber',
    create(friendId, data) {
      return friendsStore.addPhone(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updatePhone(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deletePhone(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: PhoneEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: PhoneRow,
    rowProps(item) {
      return { phone: item };
    },
    deleteName(item) {
      return item.phoneNumber;
    },
    deleteTitleKey: 'friendDetail.modal.deletePhoneNumber',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeletePhone',
    mapError: mapPhoneError,
  });

  const email = defineDescriptor<EmailResponse, EmailData>({
    key: 'email',
    shortcutEvent: 'shortcut:add-email',
    icon: Envelope,
    sectionTitleKey: 'friendDetail.sections.emailAddresses',
    addLabelKey: 'friendDetail.actions.addEmail',
    addShortcut: 'a e',
    addShortcutLabel: 'shortcuts.add.email',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.emailAddress',
    create(friendId, data) {
      return friendsStore.addEmail(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updateEmail(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deleteEmail(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: EmailEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: EmailRow,
    rowProps(item) {
      return { email: item };
    },
    deleteName(item) {
      return item.emailAddress;
    },
    deleteTitleKey: 'friendDetail.modal.deleteEmailAddress',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmail',
  });

  const address = defineDescriptor<AddressResponse, AddressData>({
    key: 'address',
    shortcutEvent: 'shortcut:add-address',
    icon: MapPin,
    sectionTitleKey: 'friendDetail.sections.addresses',
    addLabelKey: 'friendDetail.actions.addAddress',
    addShortcut: 'a a',
    addShortcutLabel: 'shortcuts.add.address',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.address',
    create(friendId, data) {
      return friendsStore.addAddress(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updateAddress(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deleteAddress(friendId, item.id);
    },
    afterSave(_reload, friendId) {
      return scheduleAddressRefetch(friendsStore, friendId);
    },
    tracksDirty: true,
    FormComponent: AddressEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: AddressRow,
    rowProps(item) {
      return { address: item };
    },
    deleteName: addressDeleteName,
    deleteTitleKey: 'friendDetail.modal.deleteAddress',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteAddress',
  });

  const url = defineDescriptor<UrlResponse, UrlData>({
    key: 'url',
    shortcutEvent: 'shortcut:add-url',
    icon: Link,
    sectionTitleKey: 'friendDetail.sections.websites',
    addLabelKey: 'friendDetail.actions.addUrl',
    addShortcut: 'a u',
    addShortcutLabel: 'shortcuts.add.url',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.websiteUrl',
    create(friendId, data) {
      return friendsStore.addUrl(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updateUrl(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deleteUrl(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: UrlEditForm,
    formProps: editFormProps,
    RowComponent: UrlRow,
    rowProps(item) {
      return { url: item };
    },
    deleteName(item) {
      return item.url;
    },
    deleteTitleKey: 'friendDetail.modal.deleteWebsite',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteWebsite',
  });

  const socialProfile = defineDescriptor<SocialProfileResponse, SocialProfileData>({
    key: 'social',
    shortcutEvent: 'shortcut:add-social',
    icon: Share,
    sectionTitleKey: 'friendDetail.sections.socialProfiles',
    addLabelKey: 'friendDetail.actions.addSocial',
    addShortcut: 'a s',
    addShortcutLabel: 'shortcuts.add.socialProfile',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.socialProfile',
    create(friendId, data) {
      return friendsStore.addSocialProfile(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updateSocialProfile(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deleteSocialProfile(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: SocialProfileEditForm,
    formProps: editFormProps,
    RowComponent: SocialProfileRow,
    rowProps(item) {
      return { profile: item };
    },
    // Only a profile that carries a URL is openable, so only those take part in
    // the friend detail page's "o" link sequence.
    linkable: hasProfileUrl,
    deleteName(item) {
      return item.username ?? item.profileUrl ?? item.platform;
    },
    deleteTitleKey: 'friendDetail.modal.deleteSocialProfile',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteSocial',
  });

  const date = defineDescriptor<FriendDateResponse, DateData>({
    key: 'date',
    shortcutEvent: 'shortcut:add-date',
    icon: Calendar,
    sectionTitleKey: 'friendDetail.sections.importantDates',
    addLabelKey: 'friendDetail.actions.addDate',
    addShortcut: 'a d',
    addShortcutLabel: 'shortcuts.add.date',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.importantDate',
    create(friendId, data) {
      return friendsStore.addDate(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updateDate(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deleteDate(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: DateEditForm,
    formProps: editFormProps,
    RowComponent: DateRow,
    rowProps(item) {
      return { date: item };
    },
    deleteName(item) {
      return item.dateValue;
    },
    deleteTitleKey: 'friendDetail.modal.deleteDate',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteDate',
  });

  const professionalHistory = defineDescriptor<
    ProfessionalHistoryResponse,
    ProfessionalHistoryData
  >({
    key: 'professional',
    shortcutEvent: 'shortcut:add-professional',
    icon: Briefcase,
    sectionTitleKey: 'friendDetail.sections.employmentHistory',
    addLabelKey: 'friendDetail.actions.addEmployment',
    addShortcut: 'a w',
    addShortcutLabel: 'shortcuts.add.workExperience',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.employment',
    create(friendId, data) {
      return friendsStore.addProfessionalHistory(friendId, data);
    },
    update(friendId, id, data) {
      return friendsStore.updateProfessionalHistory(friendId, id, data);
    },
    remove(friendId, item) {
      return friendsStore.deleteProfessionalHistory(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: ProfessionalHistoryEditForm,
    formProps: primaryAwareFormProps,
    RowComponent: ProfessionalHistoryRow,
    rowProps(item) {
      return { history: item };
    },
    deleteName(item, t) {
      return item.jobTitle ?? item.organization ?? t('friendDetail.modal.employment');
    },
    deleteTitleKey: 'friendDetail.modal.deleteEmployment',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmployment',
  });

  const circle = defineDescriptor<CircleSummaryResponse, { circleId: string }>({
    key: 'circle',
    shortcutEvent: 'shortcut:add-circle',
    icon: Users,
    sectionTitleKey: 'friendDetail.sections.circles',
    addLabelKey: 'friendDetail.actions.addCircle',
    addShortcut: 'a c',
    addShortcutLabel: 'shortcuts.add.circle',
    // A friend joins an existing circle; there is nothing to edit in place.
    editable: false,
    modalTypeNameKey: 'friendDetail.modal.circle',
    create(friendId, data) {
      return friendsStore.addCircle(friendId, data.circleId);
    },
    remove(friendId, item) {
      return friendsStore.removeCircle(friendId, item.id);
    },
    tracksDirty: true,
    FormComponent: CircleEditForm,
    formProps({ items, isLoading }) {
      return { existingCircles: items, disabled: isLoading };
    },
    RowComponent: CircleRow,
    rowProps(item) {
      return { circle: item };
    },
    deleteName(item) {
      return item.name;
    },
    deleteTitleKey: 'friendDetail.modal.removeFromCircleTitle',
    deleteDescriptionKey: 'friendDetail.modal.confirmRemoveCircle',
  });

  // Notes are not part of the friend payload, so this section loads its own items.
  const note = defineDescriptor<FriendNoteResponse, FriendNoteData>({
    key: 'note',
    shortcutEvent: 'shortcut:add-note',
    icon: DocumentText,
    sectionTitleKey: 'friendDetail.sections.notes',
    addLabelKey: 'friendDetail.actions.addNote',
    addShortcut: 'a n',
    addShortcutLabel: 'shortcuts.add.note',
    editable: true,
    modalTypeNameKey: 'friendDetail.modal.note',
    load(friendId) {
      return friendNotesApi.listNotes(friendId);
    },
    create(friendId, data) {
      return friendNotesApi.addNote(friendId, data);
    },
    update(friendId, id, data) {
      return friendNotesApi.updateNote(friendId, id, data);
    },
    remove(friendId, item) {
      return friendNotesApi.deleteNote(friendId, item.id);
    },
    // A create, update or delete can change another note's supersede state, and the
    // server orders the list newest first, so the section reloads after every change.
    reloadAfterMutate: true,
    tracksDirty: true,
    FormComponent: NoteEditForm,
    formProps(ctx) {
      return { ...editFormProps(ctx), friendId: ctx.ownerId, notes: ctx.items };
    },
    RowComponent: NoteRow,
    rowProps(item) {
      return { note: item };
    },
    deleteName(item) {
      return noteExcerpt(item.content);
    },
    deleteTitleKey: 'friendDetail.modal.deleteNote',
    deleteDescriptionKey: 'friendDetail.modal.confirmDeleteNote',
  });

  const descriptors: FriendDescriptors = {
    phone,
    email,
    address,
    url,
    socialProfile,
    date,
    professionalHistory,
    circle,
    note,
  };
  return descriptors;
}

/**
 * Joining a collective needs the collective *and* a role, so this descriptor
 * swaps the generic edit modal for `AddToCollectiveModal`. Leaving is a
 * membership deletion on the collective, not on the friend, which is why
 * `remove` reads `membershipId` off the row's item.
 */
export function createCollectiveDescriptor(options: CollectiveDescriptorOptions) {
  const { collectiveMembersApi, onChanged } = options;
  return defineDescriptor<ContactCollectiveSummaryResponse, never>({
    key: 'collective',
    shortcutEvent: 'shortcut:add-collective',
    icon: BuildingOffice,
    sectionTitleKey: 'friendDetail.sections.collectives',
    addLabelKey: 'friendDetail.actions.addCollective',
    addShortcut: 'a o',
    addShortcutLabel: 'shortcuts.add.collective',
    editable: false,
    async remove(_friendId, item) {
      await collectiveMembersApi.removeMember(item.id, item.membershipId);
      onChanged();
    },
    AddComponent: AddToCollectiveModal,
    addProps({ ownerId, ownerName, items }) {
      return {
        friendId: ownerId,
        friendDisplayName: ownerName,
        existingCollectiveIds: items.map((item) => item.id),
        onSuccess: onChanged,
      };
    },
    RowComponent: CollectiveRow,
    rowProps(item) {
      return { collective: item };
    },
    deleteName(item) {
      return item.name;
    },
    deleteTitleKey: 'friendDetail.modal.removeFromCollectiveTitle',
    deleteDescriptionKey: 'friendDetail.modal.confirmRemoveCollective',
  });
}

/**
 * Entries of the friend's "add detail" dropdown and mobile sheet, in display
 * order. Shortcut chords mirror FRIEND_DETAIL_ACTIONS in
 * `$lib/shortcuts/config.ts` ("a" + key). Relationships are listed too even
 * though they are not a descriptor-driven section — the menu is the entry
 * point for every detail a friend can gain.
 */
export function createFriendAddDetailOptions(
  descriptors: FriendDescriptors,
  collectiveDescriptor: SubresourceDescriptor,
) {
  const options: AddDetailOption[] = [
    addDetailOption(descriptors.phone, 'shortcuts.add.phone'),
    addDetailOption(descriptors.email, 'shortcuts.add.email'),
    addDetailOption(descriptors.address, 'shortcuts.add.address'),
    addDetailOption(descriptors.url, 'shortcuts.add.url'),
    addDetailOption(descriptors.date, 'shortcuts.add.date'),
    addDetailOption(descriptors.socialProfile, 'shortcuts.add.socialProfile'),
    addDetailOption(descriptors.circle, 'shortcuts.add.circle'),
    addDetailOption(collectiveDescriptor, 'shortcuts.add.collective'),
    addDetailOption(descriptors.professionalHistory, 'shortcuts.add.workExperience'),
    {
      key: 'relationship',
      icon: Heart,
      labelKey: 'shortcuts.add.relationship',
      event: 'shortcut:add-relationship',
      shortcut: 'a r',
      shortcutLabel: 'shortcuts.add.relationship',
    },
    addDetailOption(descriptors.note, 'shortcuts.add.note'),
  ];
  return options;
}
