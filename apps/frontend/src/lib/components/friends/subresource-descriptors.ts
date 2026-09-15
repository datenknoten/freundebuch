// biome-ignore-all lint/correctness/useImportExtensions: Svelte imports need .svelte extension
/**
 * Data-driven descriptors for a friend's CRUD sub-resources.
 *
 * Each descriptor captures everything that varies between the types — icon,
 * i18n keys, store calls, row/form components and the per-type quirks — so
 * `subresources/subresource-section.svelte` drives all of them with one
 * implementation instead of nine near-identical section components.
 *
 * Unlike the collectives descriptors these never `load`: the friend detail
 * page already holds every sub-resource in the friends store, so the section
 * is handed `items` and the store's own optimistic updates re-render it.
 */
import Briefcase from 'svelte-heros-v2/Briefcase.svelte';
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import Share from 'svelte-heros-v2/Share.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { ApiError } from '$lib/api/client';
import { removeMember } from '$lib/api/collectives';
import { friends } from '$lib/stores/friends';
import type {
  Address,
  AddressInput,
  CircleSummary,
  ContactCollectiveSummary,
  DateInput,
  Email,
  EmailInput,
  FriendDate,
  Phone,
  PhoneInput,
  ProfessionalHistory,
  ProfessionalHistoryInput,
  SocialProfile,
  SocialProfileInput,
  Url,
  UrlInput,
} from '$shared';
import {
  type AddDetailOption,
  addDetailOption,
  addressDeleteName,
  defineDescriptor,
  editFormProps,
  primaryAwareFormProps,
  type SubresourceDescriptor,
} from '../subresources/types';
import {
  AddressEditForm,
  AddressRow,
  AddToCollectiveModal,
  CircleEditForm,
  CircleRow,
  CollectiveRow,
  DateEditForm,
  DateRow,
  EmailEditForm,
  EmailRow,
  PhoneEditForm,
  PhoneRow,
  ProfessionalHistoryEditForm,
  ProfessionalHistoryRow,
  SocialProfileEditForm,
  SocialProfileRow,
  UrlEditForm,
  UrlRow,
} from './subresources';

export const phoneDescriptor = defineDescriptor<Phone, PhoneInput>({
  key: 'phone',
  shortcutEvent: 'shortcut:add-phone',
  icon: PhoneIcon,
  sectionTitleKey: 'friendDetail.sections.phoneNumbers',
  addLabelKey: 'friendDetail.actions.addPhone',
  addShortcut: 'a p',
  addShortcutLabel: 'shortcuts.add.phone',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.phoneNumber',
  create: (friendId, data: PhoneInput) => friends.addPhone(friendId, data),
  update: (friendId, id, data: PhoneInput) => friends.updatePhone(friendId, id, data),
  remove: (friendId, item) => friends.deletePhone(friendId, item.id),
  tracksDirty: true,
  FormComponent: PhoneEditForm,
  formProps: primaryAwareFormProps,
  RowComponent: PhoneRow,
  rowProps: (phone) => ({ phone }),
  deleteName: (phone) => phone.phoneNumber,
  deleteTitleKey: 'friendDetail.modal.deletePhoneNumber',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeletePhone',
  mapError: (err, t) => {
    if (!(err instanceof ApiError)) return undefined;
    if (err.code === 'PHONE_COUNTRY_UNKNOWN') return t('subresources.phone.unknownCountry');
    // The backend rejects unparseable numbers with a 400 and a message meant
    // for developers; show the field hint instead.
    if (err.statusCode === 400) return t('subresources.phone.invalidNumber');
    return undefined;
  },
});

export const emailDescriptor = defineDescriptor<Email, EmailInput>({
  key: 'email',
  shortcutEvent: 'shortcut:add-email',
  icon: Envelope,
  sectionTitleKey: 'friendDetail.sections.emailAddresses',
  addLabelKey: 'friendDetail.actions.addEmail',
  addShortcut: 'a e',
  addShortcutLabel: 'shortcuts.add.email',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.emailAddress',
  create: (friendId, data: EmailInput) => friends.addEmail(friendId, data),
  update: (friendId, id, data: EmailInput) => friends.updateEmail(friendId, id, data),
  remove: (friendId, item) => friends.deleteEmail(friendId, item.id),
  tracksDirty: true,
  FormComponent: EmailEditForm,
  formProps: primaryAwareFormProps,
  RowComponent: EmailRow,
  rowProps: (email) => ({ email }),
  deleteName: (email) => email.emailAddress,
  deleteTitleKey: 'friendDetail.modal.deleteEmailAddress',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmail',
});

export const addressDescriptor = defineDescriptor<Address, AddressInput>({
  key: 'address',
  shortcutEvent: 'shortcut:add-address',
  icon: MapPin,
  sectionTitleKey: 'friendDetail.sections.addresses',
  addLabelKey: 'friendDetail.actions.addAddress',
  addShortcut: 'a a',
  addShortcutLabel: 'shortcuts.add.address',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.address',
  create: (friendId, data: AddressInput) => friends.addAddress(friendId, data),
  update: (friendId, id, data: AddressInput) => friends.updateAddress(friendId, id, data),
  remove: (friendId, item) => friends.deleteAddress(friendId, item.id),
  // Geocoding runs asynchronously on the backend after the write commits. The
  // friend store owns these items, so refetch the friend (the section's own
  // reload is inert here — the descriptor has no `load`).
  afterSave: (_reload, friendId) => {
    for (const delay of [800, 2000, 4500]) {
      setTimeout(() => {
        friends.loadFriend(friendId).catch(() => undefined);
      }, delay);
    }
  },
  tracksDirty: true,
  FormComponent: AddressEditForm,
  formProps: primaryAwareFormProps,
  RowComponent: AddressRow,
  rowProps: (address) => ({ address }),
  deleteName: addressDeleteName,
  deleteTitleKey: 'friendDetail.modal.deleteAddress',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteAddress',
});

export const urlDescriptor = defineDescriptor<Url, UrlInput>({
  key: 'url',
  shortcutEvent: 'shortcut:add-url',
  icon: Link,
  sectionTitleKey: 'friendDetail.sections.websites',
  addLabelKey: 'friendDetail.actions.addUrl',
  addShortcut: 'a u',
  addShortcutLabel: 'shortcuts.add.url',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.websiteUrl',
  create: (friendId, data: UrlInput) => friends.addUrl(friendId, data),
  update: (friendId, id, data: UrlInput) => friends.updateUrl(friendId, id, data),
  remove: (friendId, item) => friends.deleteUrl(friendId, item.id),
  tracksDirty: true,
  FormComponent: UrlEditForm,
  formProps: editFormProps,
  RowComponent: UrlRow,
  rowProps: (url) => ({ url }),
  deleteName: (url) => url.url,
  deleteTitleKey: 'friendDetail.modal.deleteWebsite',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteWebsite',
});

/**
 * A social profile is only openable when it carries a URL. Shared with
 * `friend-detail.svelte`, which builds the "o" link list from the same rule.
 */
export const hasProfileUrl = (
  profile: SocialProfile,
): profile is SocialProfile & { profileUrl: string } =>
  profile.profileUrl !== null && profile.profileUrl !== undefined && profile.profileUrl.length > 0;

export const socialProfileDescriptor = defineDescriptor<SocialProfile, SocialProfileInput>({
  key: 'social',
  shortcutEvent: 'shortcut:add-social',
  icon: Share,
  sectionTitleKey: 'friendDetail.sections.socialProfiles',
  addLabelKey: 'friendDetail.actions.addSocial',
  addShortcut: 'a s',
  addShortcutLabel: 'shortcuts.add.socialProfile',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.socialProfile',
  create: (friendId, data: SocialProfileInput) => friends.addSocialProfile(friendId, data),
  update: (friendId, id, data: SocialProfileInput) =>
    friends.updateSocialProfile(friendId, id, data),
  remove: (friendId, item) => friends.deleteSocialProfile(friendId, item.id),
  tracksDirty: true,
  FormComponent: SocialProfileEditForm,
  formProps: editFormProps,
  RowComponent: SocialProfileRow,
  rowProps: (profile) => ({ profile }),
  // Only a profile that carries a URL is openable, so only those take part in
  // the friend detail page's "o" link sequence.
  linkable: hasProfileUrl,
  deleteName: (profile) => profile.username ?? profile.profileUrl ?? profile.platform,
  deleteTitleKey: 'friendDetail.modal.deleteSocialProfile',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteSocial',
});

export const dateDescriptor = defineDescriptor<FriendDate, DateInput>({
  key: 'date',
  shortcutEvent: 'shortcut:add-date',
  icon: Calendar,
  sectionTitleKey: 'friendDetail.sections.importantDates',
  addLabelKey: 'friendDetail.actions.addDate',
  addShortcut: 'a d',
  addShortcutLabel: 'shortcuts.add.date',
  editable: true,
  modalTypeNameKey: 'friendDetail.modal.importantDate',
  create: (friendId, data: DateInput) => friends.addDate(friendId, data),
  update: (friendId, id, data: DateInput) => friends.updateDate(friendId, id, data),
  remove: (friendId, item) => friends.deleteDate(friendId, item.id),
  tracksDirty: true,
  FormComponent: DateEditForm,
  formProps: editFormProps,
  RowComponent: DateRow,
  rowProps: (date) => ({ date }),
  deleteName: (date) => date.dateValue,
  deleteTitleKey: 'friendDetail.modal.deleteDate',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteDate',
});

export const professionalHistoryDescriptor = defineDescriptor<
  ProfessionalHistory,
  ProfessionalHistoryInput
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
  create: (friendId, data: ProfessionalHistoryInput) =>
    friends.addProfessionalHistory(friendId, data),
  update: (friendId, id, data: ProfessionalHistoryInput) =>
    friends.updateProfessionalHistory(friendId, id, data),
  remove: (friendId, item) => friends.deleteProfessionalHistory(friendId, item.id),
  tracksDirty: true,
  FormComponent: ProfessionalHistoryEditForm,
  formProps: primaryAwareFormProps,
  RowComponent: ProfessionalHistoryRow,
  rowProps: (history) => ({ history }),
  deleteName: (history, t) =>
    history.jobTitle ?? history.organization ?? t('friendDetail.modal.employment'),
  deleteTitleKey: 'friendDetail.modal.deleteEmployment',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmployment',
});

export const circleDescriptor = defineDescriptor<CircleSummary, { circleId: string }>({
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
  create: (friendId, data: { circleId: string }) => friends.addCircle(friendId, data.circleId),
  remove: (friendId, item) => friends.removeCircle(friendId, item.id),
  tracksDirty: true,
  FormComponent: CircleEditForm,
  formProps: ({ items, isLoading }) => ({ existingCircles: items, disabled: isLoading }),
  RowComponent: CircleRow,
  rowProps: (circle) => ({ circle }),
  deleteName: (circle) => circle.name,
  deleteTitleKey: 'friendDetail.modal.removeFromCircleTitle',
  deleteDescriptionKey: 'friendDetail.modal.confirmRemoveCircle',
});

/**
 * Joining a collective needs the collective *and* a role, so this descriptor
 * swaps the generic edit modal for `AddToCollectiveModal`. Leaving is a
 * membership deletion on the collective, not on the friend, which is why
 * `remove` reads `membershipId` off the row's item.
 */
export function createCollectiveDescriptor(onChanged: () => void): SubresourceDescriptor {
  return defineDescriptor<ContactCollectiveSummary, never>({
    key: 'collective',
    shortcutEvent: 'shortcut:add-collective',
    icon: BuildingOffice,
    sectionTitleKey: 'friendDetail.sections.collectives',
    addLabelKey: 'friendDetail.actions.addCollective',
    addShortcut: 'a o',
    addShortcutLabel: 'shortcuts.add.collective',
    editable: false,
    remove: async (_friendId, collective) => {
      await removeMember(collective.id, collective.membershipId);
      onChanged();
    },
    AddComponent: AddToCollectiveModal,
    addProps: ({ ownerId, ownerName, items }) => ({
      friendId: ownerId,
      friendDisplayName: ownerName,
      existingCollectiveIds: items.map((item) => item.id),
      onSuccess: onChanged,
    }),
    RowComponent: CollectiveRow,
    rowProps: (collective) => ({ collective }),
    deleteName: (collective) => collective.name,
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
export const friendAddDetailOptions: AddDetailOption[] = [
  addDetailOption(phoneDescriptor, 'shortcuts.add.phone'),
  addDetailOption(emailDescriptor, 'shortcuts.add.email'),
  addDetailOption(addressDescriptor, 'shortcuts.add.address'),
  addDetailOption(urlDescriptor, 'shortcuts.add.url'),
  addDetailOption(dateDescriptor, 'shortcuts.add.date'),
  addDetailOption(socialProfileDescriptor, 'shortcuts.add.socialProfile'),
  addDetailOption(circleDescriptor, 'shortcuts.add.circle'),
  // The collective descriptor is built per friend detail page (it closes over
  // the page's reload); the menu only needs its icon, event and chord, so a
  // throwaway instance stands in.
  addDetailOption(
    createCollectiveDescriptor(() => undefined),
    'shortcuts.add.collective',
  ),
  addDetailOption(professionalHistoryDescriptor, 'shortcuts.add.workExperience'),
  {
    key: 'relationship',
    icon: Heart,
    labelKey: 'shortcuts.add.relationship',
    event: 'shortcut:add-relationship',
    shortcut: 'a r',
    shortcutLabel: 'shortcuts.add.relationship',
  },
];
