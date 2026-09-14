import { describe, expect, it } from 'vitest';
import en from '$lib/i18n/locales/en.json';
import * as collectiveDescriptors from '../collectives/subresource-descriptors';
import * as friendDescriptors from '../friends/subresource-descriptors';
import type { AddDetailOption, SubresourceDescriptor } from './types';

/**
 * Descriptor i18n keys are strings the section renders straight into dialog
 * titles, so a typo shows the user a key path instead of a sentence. The
 * section tests echo keys through a mocked `t`, which cannot catch that — this
 * one resolves every key against the real bundle instead.
 */

const bundle = en as Record<string, unknown>;

function resolve(key: string): unknown {
  return key.split('.').reduce<unknown>((node, segment) => {
    if (typeof node !== 'object' || node === null) return undefined;
    return (node as Record<string, unknown>)[segment];
  }, bundle);
}

function isDescriptor(value: unknown): value is SubresourceDescriptor {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SubresourceDescriptor).key === 'string' &&
    typeof (value as SubresourceDescriptor).deleteTitleKey === 'string'
  );
}

function collectDescriptors(module: Record<string, unknown>): [string, SubresourceDescriptor][] {
  const found: [string, SubresourceDescriptor][] = [];
  for (const [name, value] of Object.entries(module)) {
    if (isDescriptor(value)) found.push([name, value]);
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (isDescriptor(entry)) found.push([`${name}[${index}]`, entry]);
      });
    }
  }
  return found;
}

function isMenuOption(value: unknown): value is AddDetailOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AddDetailOption).labelKey === 'string' &&
    typeof (value as AddDetailOption).event === 'string'
  );
}

function collectMenuOptions(module: Record<string, unknown>): [string, AddDetailOption][] {
  const found: [string, AddDetailOption][] = [];
  for (const [name, value] of Object.entries(module)) {
    if (!Array.isArray(value)) continue;
    value.forEach((entry, index) => {
      if (isMenuOption(entry)) found.push([`${name}[${index}]`, entry]);
    });
  }
  return found;
}

const descriptors: [string, SubresourceDescriptor][] = [
  ...collectDescriptors(friendDescriptors as unknown as Record<string, unknown>),
  ...collectDescriptors(collectiveDescriptors as unknown as Record<string, unknown>),
  ['createCollectiveDescriptor()', friendDescriptors.createCollectiveDescriptor(() => undefined)],
];

const menuOptions: [string, AddDetailOption][] = [
  ...collectMenuOptions(friendDescriptors as unknown as Record<string, unknown>),
  ...collectMenuOptions(collectiveDescriptors as unknown as Record<string, unknown>),
];

describe('subresource descriptor i18n keys', () => {
  it('covers both descriptor modules', () => {
    expect(descriptors.length).toBeGreaterThanOrEqual(10);
    expect(menuOptions.length).toBeGreaterThanOrEqual(10);
  });

  describe.each(descriptors)('%s', (_name, descriptor) => {
    const keys: [string, string | undefined][] = [
      ['sectionTitleKey', descriptor.sectionTitleKey],
      ['addLabelKey', descriptor.addLabelKey],
      ['addShortcutLabel', descriptor.addShortcutLabel],
      ['modalTypeNameKey', descriptor.modalTypeNameKey],
      ['deleteTitleKey', descriptor.deleteTitleKey],
      ['deleteDescriptionKey', descriptor.deleteDescriptionKey],
    ];

    it.each(
      keys.filter((entry): entry is [string, string] => entry[1] !== undefined),
    )('%s resolves to a string', (_prop, key) => {
      expect(resolve(key), key).toBeTypeOf('string');
    });
  });

  it.each(menuOptions)('%s labelKey resolves to a string', (_name, option) => {
    expect(resolve(option.labelKey), option.labelKey).toBeTypeOf('string');
    if (option.shortcutLabel !== undefined) {
      expect(resolve(option.shortcutLabel), option.shortcutLabel).toBeTypeOf('string');
    }
  });
});
