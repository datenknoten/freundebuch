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
import type { Component } from 'svelte';
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
  asFormComponent,
  type FormPropsContext,
  itemAs,
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

/** `initialData` + `disabled`, the props every simple edit form takes. */
const editFormProps = ({ editingData, isLoading }: FormPropsContext) => ({
  initialData: editingData ?? undefined,
  disabled: isLoading,
});

/** The same, plus the "first entry is primary" default. */
const primaryAwareFormProps = (ctx: FormPropsContext) => ({
  ...editFormProps(ctx),
  defaultPrimary: ctx.editingId === null && ctx.itemCount === 0,
});

export const phoneDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(PhoneEditForm),
  formProps: primaryAwareFormProps,
  RowComponent: PhoneRow,
  rowProps: (item) => ({ phone: itemAs<Phone>(item) }),
  deleteName: (item) => itemAs<Phone>(item).phoneNumber,
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
};

export const emailDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(EmailEditForm),
  formProps: primaryAwareFormProps,
  RowComponent: EmailRow,
  rowProps: (item) => ({ email: itemAs<Email>(item) }),
  deleteName: (item) => itemAs<Email>(item).emailAddress,
  deleteTitleKey: 'friendDetail.modal.deleteEmailAddress',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmail',
};

export const addressDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(AddressEditForm),
  formProps: primaryAwareFormProps,
  RowComponent: AddressRow,
  rowProps: (item) => ({ address: itemAs<Address>(item) }),
  deleteName: (item, t) => {
    const address = itemAs<Address>(item);
    const label = address.streetLine1 ?? address.city;
    return label !== null && label !== undefined && label.length > 0
      ? label
      : t('subresources.address.thisAddress');
  },
  deleteTitleKey: 'friendDetail.modal.deleteAddress',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteAddress',
};

export const urlDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(UrlEditForm),
  formProps: editFormProps,
  RowComponent: UrlRow,
  rowProps: (item) => ({ url: itemAs<Url>(item) }),
  deleteName: (item) => itemAs<Url>(item).url,
  deleteTitleKey: 'friendDetail.modal.deleteWebsite',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteWebsite',
};

/**
 * A social profile is only openable when it carries a URL. Shared with
 * `friend-detail.svelte`, which builds the "o" link list from the same rule.
 */
export const hasProfileUrl = (
  profile: SocialProfile,
): profile is SocialProfile & { profileUrl: string } =>
  profile.profileUrl !== null && profile.profileUrl !== undefined && profile.profileUrl.length > 0;

export const socialProfileDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(SocialProfileEditForm),
  formProps: editFormProps,
  RowComponent: SocialProfileRow,
  rowProps: (item) => ({ profile: itemAs<SocialProfile>(item) }),
  // Only a profile that carries a URL is openable, so only those take part in
  // the friend detail page's "o" link sequence.
  linkable: (item) => hasProfileUrl(itemAs<SocialProfile>(item)),
  deleteName: (item) => {
    const profile = itemAs<SocialProfile>(item);
    return profile.username ?? profile.profileUrl ?? profile.platform;
  },
  deleteTitleKey: 'friendDetail.modal.deleteSocialProfile',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteSocial',
};

export const dateDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(DateEditForm),
  formProps: editFormProps,
  RowComponent: DateRow,
  rowProps: (item) => ({ date: itemAs<FriendDate>(item) }),
  deleteName: (item) => itemAs<FriendDate>(item).dateValue,
  deleteTitleKey: 'friendDetail.modal.deleteDate',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteDate',
};

export const professionalHistoryDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(ProfessionalHistoryEditForm),
  formProps: primaryAwareFormProps,
  RowComponent: ProfessionalHistoryRow,
  rowProps: (item) => ({ history: itemAs<ProfessionalHistory>(item) }),
  deleteName: (item, t) => {
    const history = itemAs<ProfessionalHistory>(item);
    return history.jobTitle ?? history.organization ?? t('friendDetail.modal.employment');
  },
  deleteTitleKey: 'friendDetail.modal.deleteEmployment',
  deleteDescriptionKey: 'friendDetail.modal.confirmDeleteEmployment',
};

export const circleDescriptor: SubresourceDescriptor = {
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
  FormComponent: asFormComponent(CircleEditForm),
  formProps: ({ items, isLoading }) => ({
    existingCircles: items.map((item) => itemAs<CircleSummary>(item)),
    disabled: isLoading,
  }),
  RowComponent: CircleRow,
  rowProps: (item) => ({ circle: itemAs<CircleSummary>(item) }),
  deleteName: (item) => itemAs<CircleSummary>(item).name,
  deleteTitleKey: 'friendDetail.modal.removeFromCircleTitle',
  deleteDescriptionKey: 'friendDetail.modal.confirmRemoveCircle',
};

/**
 * Joining a collective needs the collective *and* a role, so this descriptor
 * swaps the generic edit modal for `AddToCollectiveModal`. Leaving is a
 * membership deletion on the collective, not on the friend, which is why
 * `remove` reads `membershipId` off the row's item.
 */
export function createCollectiveDescriptor(onChanged: () => void): SubresourceDescriptor {
  return {
    key: 'collective',
    shortcutEvent: 'shortcut:add-collective',
    icon: BuildingOffice,
    sectionTitleKey: 'friendDetail.sections.collectives',
    addLabelKey: 'friendDetail.actions.addCollective',
    addShortcut: 'a o',
    addShortcutLabel: 'shortcuts.add.collective',
    editable: false,
    // Unused: AddComponent owns creation, so the section never calls this.
    create: () => Promise.resolve(),
    remove: async (_friendId, item) => {
      const collective = itemAs<ContactCollectiveSummary>(item);
      await removeMember(collective.id, collective.membershipId);
      onChanged();
    },
    // The modal takes concrete props; the descriptor's slot is prop-agnostic.
    AddComponent: AddToCollectiveModal as unknown as Component<Record<string, unknown>>,
    addProps: ({ ownerId, ownerName, items }) => ({
      friendId: ownerId,
      friendDisplayName: ownerName,
      existingCollectiveIds: items.map((item) => item.id),
      onSuccess: onChanged,
    }),
    RowComponent: CollectiveRow,
    rowProps: (item) => ({ collective: itemAs<ContactCollectiveSummary>(item) }),
    deleteName: (item) => itemAs<ContactCollectiveSummary>(item).name,
    deleteTitleKey: 'friendDetail.modal.removeFromCollectiveTitle',
    deleteDescriptionKey: 'friendDetail.modal.confirmRemoveCollective',
  };
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
    createCollectiveDescriptor(() => {}),
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
