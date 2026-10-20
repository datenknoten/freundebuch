import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneEditForm from '$lib/components/friends/subresources/PhoneEditForm.svelte';
import { aPhone } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { render, screen } from '$lib/test/render.js';

// Required fields append a " *" to the label, so labels match as prefixes.
const PHONE_NUMBER_LABEL = /^Phone Number/;
const TYPE_LABEL = /^Type/;
const PRIMARY_LABEL = /^Primary phone number/;

describe('PhoneEditForm', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('an empty form', () => {
    it('renders the phone fields with their translated labels', () => {
      render(PhoneEditForm, {});

      expect(screen.getByLabelText(PHONE_NUMBER_LABEL)).toBeTruthy();
      expect(screen.getByLabelText(TYPE_LABEL)).toBeTruthy();
      expect(screen.getByLabelText(/^Label/)).toBeTruthy();
      expect(screen.getByLabelText(PRIMARY_LABEL)).toBeTruthy();
    });

    it('offers the five phone type options', () => {
      render(PhoneEditForm, {});

      expect(screen.getByLabelText(TYPE_LABEL)).toHaveProperty('options.length', 5);
    });
  });

  describe('an existing phone', () => {
    it('prefills the fields from initialData', () => {
      render(PhoneEditForm, {
        initialData: aPhone({ phoneNumber: '+1 555 0100', phoneType: 'work', isPrimary: true }),
      });

      expect(screen.getByLabelText(PHONE_NUMBER_LABEL)).toHaveProperty('value', '+1 555 0100');
      expect(screen.getByLabelText(TYPE_LABEL)).toHaveProperty('value', 'work');
      expect(screen.getByLabelText(PRIMARY_LABEL)).toHaveProperty('checked', true);
    });
  });
});
