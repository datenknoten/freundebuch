import { describe, expect, it } from 'vitest';
import { createCollectiveDescriptors } from '$lib/components/collectives/subresource-descriptors.js';
import {
  createCollectiveDescriptor,
  createFriendAddDetailOptions,
  createFriendDescriptors,
} from '$lib/components/friends/subresource-descriptors.js';
import type { AddDetailOption, SubresourceDescriptor } from '$lib/components/subresources/types.js';
import en from '$lib/i18n/locales/en.json';
import { createTestAppContext } from '$lib/test/test-app-context.js';

const { api, stores } = createTestAppContext();
const friendDescriptors = createFriendDescriptors({
  friendsStore: stores.friends,
  friendNotesApi: api.friendNotes,
});
const friendCollectiveDescriptor = createCollectiveDescriptor({
  collectiveMembersApi: api.collectiveMembers,
  onChanged() {
    return undefined;
  },
});
const friendModule = {
  ...friendDescriptors,
  friendAddDetailOptions: createFriendAddDetailOptions(
    friendDescriptors,
    friendCollectiveDescriptor,
  ),
};
const collectiveDescriptors = createCollectiveDescriptors({
  collectivesApi: api.collectives,
  collectiveContactsApi: api.collectiveContacts,
});

/**
 * Descriptor i18n keys are strings the section renders straight into dialog
 * titles, so a typo shows the user a key path instead of a sentence. i18next
 * renders a missing key verbatim, so this resolves every key against the
 * bundle instead of relying on a rendered string.
 */

function childOf(node: unknown, segment: string) {
  if (typeof node !== 'object' || node === null) {
    return undefined;
  }
  return new Map(Object.entries(node)).get(segment);
}

function resolve(key: string) {
  return key.split('.').reduce<unknown>(childOf, en);
}

function isDescriptor(value: unknown): value is SubresourceDescriptor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof value.key === 'string' &&
    'deleteTitleKey' in value &&
    typeof value.deleteTitleKey === 'string'
  );
}

function collectDescriptors(module: object) {
  const found: [string, SubresourceDescriptor][] = [];
  for (const [name, value] of Object.entries(module)) {
    if (isDescriptor(value) === true) {
      found.push([name, value]);
    }
    if (Array.isArray(value) === true) {
      for (const [index, entry] of value.entries()) {
        if (isDescriptor(entry) === true) {
          found.push([`${name}[${index}]`, entry]);
        }
      }
    }
  }
  return found;
}

function isMenuOption(value: unknown): value is AddDetailOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'labelKey' in value &&
    typeof value.labelKey === 'string' &&
    'event' in value &&
    typeof value.event === 'string'
  );
}

function collectMenuOptions(module: object) {
  const found: [string, AddDetailOption][] = [];
  for (const [name, value] of Object.entries(module)) {
    if (Array.isArray(value) === true) {
      for (const [index, entry] of value.entries()) {
        if (isMenuOption(entry) === true) {
          found.push([`${name}[${index}]`, entry]);
        }
      }
    }
  }
  return found;
}

const DESCRIPTORS: [string, SubresourceDescriptor][] = [
  ...collectDescriptors(friendModule),
  ...collectDescriptors(collectiveDescriptors),
  ['createCollectiveDescriptor()', friendCollectiveDescriptor],
];

const MENU_OPTIONS = [
  ...collectMenuOptions(friendModule),
  ...collectMenuOptions(collectiveDescriptors),
];

describe('SubresourceDescriptor', () => {
  describe('i18n keys', () => {
    it('covers both descriptor modules', () => {
      expect(DESCRIPTORS.length).toBeGreaterThanOrEqual(10);
      expect(MENU_OPTIONS.length).toBeGreaterThanOrEqual(10);
    });

    describe.each(DESCRIPTORS)('%s', (_name, descriptor) => {
      const keys: [string, string | undefined][] = [
        ['sectionTitleKey', descriptor.sectionTitleKey],
        ['addLabelKey', descriptor.addLabelKey],
        ['addShortcutLabel', descriptor.addShortcutLabel],
        [
          'modalTypeNameKey',
          'AddComponent' in descriptor ? undefined : descriptor.modalTypeNameKey,
        ],
        ['deleteTitleKey', descriptor.deleteTitleKey],
        ['deleteDescriptionKey', descriptor.deleteDescriptionKey],
      ];

      it.each(keys.filter((entry): entry is [string, string] => entry[1] !== undefined))(
        '%s resolves to a string',
        (_prop, key) => {
          expect(resolve(key), key).toBeTypeOf('string');
        },
      );
    });

    it.each(MENU_OPTIONS)('%s labelKey resolves to a string', (_name, option) => {
      expect(resolve(option.labelKey), option.labelKey).toBeTypeOf('string');
      if (option.shortcutLabel !== undefined) {
        expect(resolve(option.shortcutLabel), option.shortcutLabel).toBeTypeOf('string');
      }
    });
  });
});
