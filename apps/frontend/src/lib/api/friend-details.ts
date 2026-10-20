import {
  AddressResponseSchema,
  type DateInputSchema,
  type DateType,
  EmailResponseSchema,
  FriendDateResponseSchema,
  MessageResponseSchema,
  MetInfoResponseSchema,
  PhoneResponseSchema,
  type ProfessionalHistoryInputSchema,
  ProfessionalHistoryResponseSchema,
  type RelationshipCreateInputSchema,
  RelationshipResponseSchema,
  type RelationshipTypeId,
  type RelationshipUpdateInputSchema,
  type SocialPlatform,
  type SocialProfileInputSchema,
  SocialProfileResponseSchema,
  UrlResponseSchema,
} from '$shared';
import { type AddressData, mapAddressInput } from './address-data.js';
import type { ApiClient } from './api-client.js';
import { type EmailData, mapEmailInput } from './email-data.js';
import { type MetInfoData, mapMetInfoInput } from './met-info-data.js';
import { mapPhoneInput, type PhoneData } from './phone-data.js';
import { mapUrlInput, type UrlData } from './url-data.js';

export interface FriendDetailsApiOptions {
  client: ApiClient;
}

export interface DateData {
  dateValue: string;
  yearKnown?: boolean;
  dateType: DateType;
  label?: string;
}

export interface SocialProfileData {
  platform: SocialPlatform;
  profileUrl?: string | null;
  username?: string | null;
}

export interface ProfessionalHistoryData {
  jobTitle?: string | null;
  organization?: string | null;
  department?: string | null;
  notes?: string | null;
  fromMonth: number;
  fromYear: number;
  toMonth?: number | null;
  toYear?: number | null;
  isPrimary?: boolean;
}

export interface RelationshipCreateData {
  relatedFriendId: string;
  relationshipTypeId: RelationshipTypeId;
  notes?: string;
}

export interface RelationshipUpdateData {
  notes?: string | null;
}

function mapDateInput(data: DateData) {
  return {
    date_value: data.dateValue,
    year_known: data.yearKnown,
    date_type: data.dateType,
    label: data.label,
  } satisfies typeof DateInputSchema.inferIn;
}

function mapSocialProfileInput(data: SocialProfileData) {
  return {
    platform: data.platform,
    profile_url: data.profileUrl,
    username: data.username,
  } satisfies typeof SocialProfileInputSchema.inferIn;
}

function mapProfessionalHistoryInput(data: ProfessionalHistoryData) {
  return {
    job_title: data.jobTitle,
    organization: data.organization,
    department: data.department,
    notes: data.notes,
    from_month: data.fromMonth,
    from_year: data.fromYear,
    to_month: data.toMonth,
    to_year: data.toYear,
    is_primary: data.isPrimary,
  } satisfies typeof ProfessionalHistoryInputSchema.inferIn;
}

function mapRelationshipCreateInput(data: RelationshipCreateData) {
  return {
    related_friend_id: data.relatedFriendId,
    relationship_type_id: data.relationshipTypeId,
    notes: data.notes,
  } satisfies typeof RelationshipCreateInputSchema.inferIn;
}

function mapRelationshipUpdateInput(data: RelationshipUpdateData) {
  return { notes: data.notes } satisfies typeof RelationshipUpdateInputSchema.inferIn;
}

/** The sub-resources a friend carries inline: contact details, dates, met info, profiles, jobs, relationships. */
export class FriendDetailsApi {
  private readonly client: ApiClient;

  public constructor(options: FriendDetailsApiOptions) {
    this.client = options.client;
  }

  public addPhone(friendId: string, data: PhoneData) {
    return this.client.request(PhoneResponseSchema, `/api/friends/${friendId}/phones`, {
      method: 'POST',
      body: JSON.stringify(mapPhoneInput(data)),
    });
  }

  public updatePhone(friendId: string, phoneId: string, data: PhoneData) {
    return this.client.request(PhoneResponseSchema, `/api/friends/${friendId}/phones/${phoneId}`, {
      method: 'PUT',
      body: JSON.stringify(mapPhoneInput(data)),
    });
  }

  public async deletePhone(friendId: string, phoneId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/phones/${phoneId}`, {
      method: 'DELETE',
    });
  }

  public addEmail(friendId: string, data: EmailData) {
    return this.client.request(EmailResponseSchema, `/api/friends/${friendId}/emails`, {
      method: 'POST',
      body: JSON.stringify(mapEmailInput(data)),
    });
  }

  public updateEmail(friendId: string, emailId: string, data: EmailData) {
    return this.client.request(EmailResponseSchema, `/api/friends/${friendId}/emails/${emailId}`, {
      method: 'PUT',
      body: JSON.stringify(mapEmailInput(data)),
    });
  }

  public async deleteEmail(friendId: string, emailId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/emails/${emailId}`, {
      method: 'DELETE',
    });
  }

  public addAddress(friendId: string, data: AddressData) {
    return this.client.request(AddressResponseSchema, `/api/friends/${friendId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(mapAddressInput(data)),
    });
  }

  public updateAddress(friendId: string, addressId: string, data: AddressData) {
    return this.client.request(
      AddressResponseSchema,
      `/api/friends/${friendId}/addresses/${addressId}`,
      { method: 'PUT', body: JSON.stringify(mapAddressInput(data)) },
    );
  }

  public async deleteAddress(friendId: string, addressId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/friends/${friendId}/addresses/${addressId}`,
      { method: 'DELETE' },
    );
  }

  public addUrl(friendId: string, data: UrlData) {
    return this.client.request(UrlResponseSchema, `/api/friends/${friendId}/urls`, {
      method: 'POST',
      body: JSON.stringify(mapUrlInput(data)),
    });
  }

  public updateUrl(friendId: string, urlId: string, data: UrlData) {
    return this.client.request(UrlResponseSchema, `/api/friends/${friendId}/urls/${urlId}`, {
      method: 'PUT',
      body: JSON.stringify(mapUrlInput(data)),
    });
  }

  public async deleteUrl(friendId: string, urlId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/urls/${urlId}`, {
      method: 'DELETE',
    });
  }

  public addDate(friendId: string, data: DateData) {
    return this.client.request(FriendDateResponseSchema, `/api/friends/${friendId}/dates`, {
      method: 'POST',
      body: JSON.stringify(mapDateInput(data)),
    });
  }

  public updateDate(friendId: string, dateId: string, data: DateData) {
    return this.client.request(
      FriendDateResponseSchema,
      `/api/friends/${friendId}/dates/${dateId}`,
      { method: 'PUT', body: JSON.stringify(mapDateInput(data)) },
    );
  }

  public async deleteDate(friendId: string, dateId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/dates/${dateId}`, {
      method: 'DELETE',
    });
  }

  /** Creates or replaces how and where the user met the friend. */
  public setMetInfo(friendId: string, data: MetInfoData) {
    return this.client.request(MetInfoResponseSchema, `/api/friends/${friendId}/met-info`, {
      method: 'PUT',
      body: JSON.stringify(mapMetInfoInput(data)),
    });
  }

  public async deleteMetInfo(friendId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/met-info`, {
      method: 'DELETE',
    });
  }

  public addSocialProfile(friendId: string, data: SocialProfileData) {
    return this.client.request(
      SocialProfileResponseSchema,
      `/api/friends/${friendId}/social-profiles`,
      { method: 'POST', body: JSON.stringify(mapSocialProfileInput(data)) },
    );
  }

  public updateSocialProfile(friendId: string, profileId: string, data: SocialProfileData) {
    return this.client.request(
      SocialProfileResponseSchema,
      `/api/friends/${friendId}/social-profiles/${profileId}`,
      { method: 'PUT', body: JSON.stringify(mapSocialProfileInput(data)) },
    );
  }

  public async deleteSocialProfile(friendId: string, profileId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/friends/${friendId}/social-profiles/${profileId}`,
      { method: 'DELETE' },
    );
  }

  public addProfessionalHistory(friendId: string, data: ProfessionalHistoryData) {
    return this.client.request(
      ProfessionalHistoryResponseSchema,
      `/api/friends/${friendId}/professional-history`,
      { method: 'POST', body: JSON.stringify(mapProfessionalHistoryInput(data)) },
    );
  }

  public updateProfessionalHistory(
    friendId: string,
    historyId: string,
    data: ProfessionalHistoryData,
  ) {
    return this.client.request(
      ProfessionalHistoryResponseSchema,
      `/api/friends/${friendId}/professional-history/${historyId}`,
      { method: 'PUT', body: JSON.stringify(mapProfessionalHistoryInput(data)) },
    );
  }

  public async deleteProfessionalHistory(friendId: string, historyId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/friends/${friendId}/professional-history/${historyId}`,
      { method: 'DELETE' },
    );
  }

  public addRelationship(friendId: string, data: RelationshipCreateData) {
    return this.client.request(
      RelationshipResponseSchema,
      `/api/friends/${friendId}/relationships`,
      { method: 'POST', body: JSON.stringify(mapRelationshipCreateInput(data)) },
    );
  }

  public updateRelationship(
    friendId: string,
    relationshipId: string,
    data: RelationshipUpdateData,
  ) {
    return this.client.request(
      RelationshipResponseSchema,
      `/api/friends/${friendId}/relationships/${relationshipId}`,
      { method: 'PUT', body: JSON.stringify(mapRelationshipUpdateInput(data)) },
    );
  }

  public async deleteRelationship(friendId: string, relationshipId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/friends/${friendId}/relationships/${relationshipId}`,
      { method: 'DELETE' },
    );
  }
}
