import {
  AddressResponseSchema,
  EmailResponseSchema,
  MessageResponseSchema,
  PhoneResponseSchema,
  UrlResponseSchema,
} from '$shared';
import { type AddressData, mapAddressInput } from './address-data.js';
import type { ApiClient } from './api-client.js';
import { type EmailData, mapEmailInput } from './email-data.js';
import { mapPhoneInput, type PhoneData } from './phone-data.js';
import { mapUrlInput, type UrlData } from './url-data.js';

export interface CollectiveContactsApiOptions {
  client: ApiClient;
}

const PhoneResponseListSchema = PhoneResponseSchema.array();
const EmailResponseListSchema = EmailResponseSchema.array();
const AddressResponseListSchema = AddressResponseSchema.array();
const UrlResponseListSchema = UrlResponseSchema.array();

/** The phones, emails, addresses and URLs of a collective. */
export class CollectiveContactsApi {
  private readonly client: ApiClient;

  public constructor(options: CollectiveContactsApiOptions) {
    this.client = options.client;
  }

  //#region Phones
  public listPhones(collectiveId: string) {
    return this.client.request(PhoneResponseListSchema, `/api/collectives/${collectiveId}/phones`);
  }

  public addPhone(collectiveId: string, data: PhoneData) {
    return this.client.request(PhoneResponseSchema, `/api/collectives/${collectiveId}/phones`, {
      method: 'POST',
      body: JSON.stringify(mapPhoneInput(data)),
    });
  }

  public updatePhone(collectiveId: string, phoneId: string, data: PhoneData) {
    return this.client.request(
      PhoneResponseSchema,
      `/api/collectives/${collectiveId}/phones/${phoneId}`,
      { method: 'PUT', body: JSON.stringify(mapPhoneInput(data)) },
    );
  }

  public async deletePhone(collectiveId: string, phoneId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/collectives/${collectiveId}/phones/${phoneId}`,
      { method: 'DELETE' },
    );
  }
  //#endregion

  //#region Emails
  public listEmails(collectiveId: string) {
    return this.client.request(EmailResponseListSchema, `/api/collectives/${collectiveId}/emails`);
  }

  public addEmail(collectiveId: string, data: EmailData) {
    return this.client.request(EmailResponseSchema, `/api/collectives/${collectiveId}/emails`, {
      method: 'POST',
      body: JSON.stringify(mapEmailInput(data)),
    });
  }

  public updateEmail(collectiveId: string, emailId: string, data: EmailData) {
    return this.client.request(
      EmailResponseSchema,
      `/api/collectives/${collectiveId}/emails/${emailId}`,
      { method: 'PUT', body: JSON.stringify(mapEmailInput(data)) },
    );
  }

  public async deleteEmail(collectiveId: string, emailId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/collectives/${collectiveId}/emails/${emailId}`,
      { method: 'DELETE' },
    );
  }
  //#endregion

  //#region Addresses
  public listAddresses(collectiveId: string) {
    return this.client.request(
      AddressResponseListSchema,
      `/api/collectives/${collectiveId}/addresses`,
    );
  }

  public addAddress(collectiveId: string, data: AddressData) {
    return this.client.request(
      AddressResponseSchema,
      `/api/collectives/${collectiveId}/addresses`,
      { method: 'POST', body: JSON.stringify(mapAddressInput(data)) },
    );
  }

  public updateAddress(collectiveId: string, addressId: string, data: AddressData) {
    return this.client.request(
      AddressResponseSchema,
      `/api/collectives/${collectiveId}/addresses/${addressId}`,
      { method: 'PUT', body: JSON.stringify(mapAddressInput(data)) },
    );
  }

  public async deleteAddress(collectiveId: string, addressId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/collectives/${collectiveId}/addresses/${addressId}`,
      { method: 'DELETE' },
    );
  }
  //#endregion

  //#region URLs
  public listUrls(collectiveId: string) {
    return this.client.request(UrlResponseListSchema, `/api/collectives/${collectiveId}/urls`);
  }

  public addUrl(collectiveId: string, data: UrlData) {
    return this.client.request(UrlResponseSchema, `/api/collectives/${collectiveId}/urls`, {
      method: 'POST',
      body: JSON.stringify(mapUrlInput(data)),
    });
  }

  public updateUrl(collectiveId: string, urlId: string, data: UrlData) {
    return this.client.request(
      UrlResponseSchema,
      `/api/collectives/${collectiveId}/urls/${urlId}`,
      {
        method: 'PUT',
        body: JSON.stringify(mapUrlInput(data)),
      },
    );
  }

  public async deleteUrl(collectiveId: string, urlId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/collectives/${collectiveId}/urls/${urlId}`,
      { method: 'DELETE' },
    );
  }
  //#endregion
}
