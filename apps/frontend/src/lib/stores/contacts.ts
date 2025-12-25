import { derived, writable } from 'svelte/store';
import type {
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  ContactListItem,
  Phone,
  Email,
  Address,
  Url,
  PhoneInput,
  EmailInput,
  AddressInput,
  UrlInput,
} from '$shared';
import * as contactsApi from '../api/contacts.js';
import { ApiError } from '../api/auth.js';

/**
 * Contacts state interface
 */
interface ContactsState {
  contacts: ContactListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentContact: Contact | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial contacts state
 */
const initialState: ContactsState = {
  contacts: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 0,
  currentContact: null,
  isLoading: false,
  error: null,
};

/**
 * Create the contacts store
 */
function createContactsStore() {
  const { subscribe, set, update } = writable<ContactsState>(initialState);

  return {
    subscribe,

    /**
     * Load paginated contact list
     */
    loadContacts: async (params: contactsApi.ContactListParams = {}) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await contactsApi.listContacts(params);

        update((state) => ({
          ...state,
          contacts: result.contacts,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load contacts';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Load a single contact by ID
     */
    loadContact: async (id: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const contact = await contactsApi.getContact(id);

        update((state) => ({
          ...state,
          currentContact: contact,
          isLoading: false,
          error: null,
        }));

        return contact;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load contact';

        update((state) => ({
          ...state,
          currentContact: null,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Create a new contact
     */
    createContact: async (data: ContactCreateInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const contact = await contactsApi.createContact(data);

        update((state) => ({
          ...state,
          currentContact: contact,
          isLoading: false,
          error: null,
        }));

        return contact;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to create contact';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update an existing contact
     */
    updateContact: async (id: string, data: ContactUpdateInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const contact = await contactsApi.updateContact(id, data);

        update((state) => ({
          ...state,
          currentContact: contact,
          isLoading: false,
          error: null,
        }));

        return contact;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to update contact';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a contact
     */
    deleteContact: async (id: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await contactsApi.deleteContact(id);

        update((state) => ({
          ...state,
          contacts: state.contacts.filter((c) => c.id !== id),
          currentContact: state.currentContact?.id === id ? null : state.currentContact,
          total: state.total - 1,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to delete contact';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Phone Operations
    // =========================================================================

    /**
     * Add a phone to the current contact
     */
    addPhone: async (contactId: string, data: PhoneInput): Promise<Phone> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const phone = await contactsApi.addPhone(contactId, data);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? { ...state.currentContact, phones: [...state.currentContact.phones, phone] }
            : null,
          isLoading: false,
          error: null,
        }));

        return phone;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add phone';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a phone from the current contact
     */
    deletePhone: async (contactId: string, phoneId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await contactsApi.deletePhone(contactId, phoneId);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? {
                ...state.currentContact,
                phones: state.currentContact.phones.filter((p) => p.id !== phoneId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete phone';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Email Operations
    // =========================================================================

    /**
     * Add an email to the current contact
     */
    addEmail: async (contactId: string, data: EmailInput): Promise<Email> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const email = await contactsApi.addEmail(contactId, data);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? { ...state.currentContact, emails: [...state.currentContact.emails, email] }
            : null,
          isLoading: false,
          error: null,
        }));

        return email;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add email';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete an email from the current contact
     */
    deleteEmail: async (contactId: string, emailId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await contactsApi.deleteEmail(contactId, emailId);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? {
                ...state.currentContact,
                emails: state.currentContact.emails.filter((e) => e.id !== emailId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete email';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Address Operations
    // =========================================================================

    /**
     * Add an address to the current contact
     */
    addAddress: async (contactId: string, data: AddressInput): Promise<Address> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const address = await contactsApi.addAddress(contactId, data);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? { ...state.currentContact, addresses: [...state.currentContact.addresses, address] }
            : null,
          isLoading: false,
          error: null,
        }));

        return address;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add address';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete an address from the current contact
     */
    deleteAddress: async (contactId: string, addressId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await contactsApi.deleteAddress(contactId, addressId);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? {
                ...state.currentContact,
                addresses: state.currentContact.addresses.filter((a) => a.id !== addressId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to delete address';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // URL Operations
    // =========================================================================

    /**
     * Add a URL to the current contact
     */
    addUrl: async (contactId: string, data: UrlInput): Promise<Url> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const url = await contactsApi.addUrl(contactId, data);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? { ...state.currentContact, urls: [...state.currentContact.urls, url] }
            : null,
          isLoading: false,
          error: null,
        }));

        return url;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add URL';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a URL from the current contact
     */
    deleteUrl: async (contactId: string, urlId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await contactsApi.deleteUrl(contactId, urlId);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? {
                ...state.currentContact,
                urls: state.currentContact.urls.filter((u) => u.id !== urlId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete URL';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Photo Operations
    // =========================================================================

    /**
     * Upload a photo for the current contact
     */
    uploadPhoto: async (contactId: string, file: File) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await contactsApi.uploadPhoto(contactId, file);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? {
                ...state.currentContact,
                photoUrl: result.photoUrl,
                photoThumbnailUrl: result.photoThumbnailUrl,
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to upload photo';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete the current contact's photo
     */
    deletePhoto: async (contactId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await contactsApi.deletePhoto(contactId);

        update((state) => ({
          ...state,
          currentContact: state.currentContact
            ? {
                ...state.currentContact,
                photoUrl: undefined,
                photoThumbnailUrl: undefined,
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete photo';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /**
     * Clear the current contact
     */
    clearCurrentContact: () => {
      update((state) => ({ ...state, currentContact: null }));
    },

    /**
     * Clear any errors
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Reset the store to initial state
     */
    reset: () => {
      set(initialState);
    },
  };
}

/**
 * The global contacts store
 */
export const contacts = createContactsStore();

/**
 * Derived store for loading state
 */
export const isContactsLoading = derived(contacts, ($contacts) => $contacts.isLoading);

/**
 * Derived store for current contact
 */
export const currentContact = derived(contacts, ($contacts) => $contacts.currentContact);

/**
 * Derived store for contact list
 */
export const contactList = derived(contacts, ($contacts) => $contacts.contacts);
